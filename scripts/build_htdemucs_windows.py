import os
import sys
from pathlib import Path
import torch
from torch.nn import functional as F
import onnx
from onnxconverter_common import float16

from demucs.pretrained import get_model
from demucs.htdemucs import HTDemucs, standalone_spec, standalone_magnitude

def main():
    repo_root = Path(__file__).resolve().parent.parent
    out_dir = repo_root / "htdemucs-onnx-out"
    out_dir.mkdir(parents=True, exist_ok=True)

    fp32_temp_dir = Path(os.environ.get("TEMP", "C:/Temp")) / "composer_htdemucs_build"
    fp32_temp_dir.mkdir(parents=True, exist_ok=True)
    raw_fp32_path = fp32_temp_dir / "htdemucs.onnx"

    print("==> 1. Loading official HTDemucs PyTorch model weights...")
    model = get_model("htdemucs")
    if isinstance(model, HTDemucs):
        core_model = model
    elif hasattr(model, "models") and isinstance(model.models[0], HTDemucs):
        core_model = model.models[0]
    else:
        raise TypeError(f"Unsupported model type: {type(model)}")

    core_model.eval()

    print("==> 2. Preparing dummy inputs...")
    dummy_waveform = torch.randn(1, 2, 343980)
    training_length = int(core_model.segment * core_model.samplerate)
    dummy_waveform = F.pad(dummy_waveform, (0, training_length - dummy_waveform.shape[-1]))
    magspec = standalone_magnitude(standalone_spec(dummy_waveform))
    dummy_input = (dummy_waveform, magspec)

    print(f"==> 3. Exporting PyTorch to ONNX (fp32) -> {raw_fp32_path}...")
    torch.onnx.export(
        core_model,
        dummy_input,
        str(raw_fp32_path),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["input", "x"],
        output_names=["output", "add_67"],
    )
    print("ONNX fp32 export completed.")

    print(f"==> 4. Loading exported model from {raw_fp32_path}...")
    model_proto = onnx.load(str(raw_fp32_path))

    fp32_out = out_dir / "htdemucs_fp32.onnx"
    print(f"==> 5. Saving single-file fp32 -> {fp32_out}...")
    onnx.save_model(model_proto, str(fp32_out), save_as_external_data=False)
    print(f"   fp32 size: {os.path.getsize(fp32_out):,} bytes")

    fp16_out = out_dir / "htdemucs_fp16.onnx"
    print(f"==> 6. Quantizing to fp16 -> {fp16_out}...")
    fp16_proto = float16.convert_float_to_float16(
        model_proto,
        keep_io_types=True,
        disable_shape_infer=False,
    )
    graph_outputs = {o.name for o in fp16_proto.graph.output}
    for node in fp16_proto.graph.node:
        if node.op_type == "Cast":
            out = node.output[0]
            if out not in graph_outputs:
                for a in node.attribute:
                    if a.name == "to" and a.i == 1:
                        a.i = 10
    fp16_proto.graph.ClearField("value_info")
    onnx.save_model(fp16_proto, str(fp16_out), save_as_external_data=False)
    print(f"   fp16 size: {os.path.getsize(fp16_out):,} bytes")

    print("==> 7. Inspecting model I/O contract:")
    for variant, path in [("fp16", fp16_out), ("fp32", fp32_out)]:
        print(f"\n-- {path.name} ({os.path.getsize(path):,} bytes) --")
        m = onnx.load(str(path), load_external_data=False)
        print("inputs:")
        for inp in m.graph.input:
            dims = [d.dim_value if d.dim_value > 0 else (d.dim_param or "?") for d in inp.type.tensor_type.shape.dim]
            print(f"  {inp.name}: {dims}  elem_type={inp.type.tensor_type.elem_type}")
        print("outputs:")
        for out in m.graph.output:
            dims = [d.dim_value if d.dim_value > 0 else (d.dim_param or "?") for d in out.type.tensor_type.shape.dim]
            print(f"  {out.name}: {dims}  elem_type={out.type.tensor_type.elem_type}")

    print("\nSUCCESS: Both ONNX models generated cleanly in:", out_dir)

if __name__ == "__main__":
    main()
