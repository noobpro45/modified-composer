package app

import (
	"os"
	"strings"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// SetHasUnsavedChanges updates the backend's tracking of whether the current project has unsaved changes.
func (a *App) SetHasUnsavedChanges(unsaved bool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.state.SetUnsavedChanges(unsaved)
}

// ShowSaveFileDialog opens the native OS "Save As" dialog for projects and returns the selected file path.
func (a *App) ShowSaveFileDialog(suggestedName string, defaultDir string) (string, error) {
	return wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		DefaultDirectory: defaultDir,
		DefaultFilename:  suggestedName,
		Title:            "Save Project",
		Filters: []wailsRuntime.FileFilter{
			{
				DisplayName: "Composer Projects (*.composer)",
				Pattern:     "*.composer",
			},
			{
				DisplayName: "JSON Files (*.json)",
				Pattern:     "*.json",
			},
		},
	})
}

// ShowTTMLSaveFileDialog opens the native OS "Save As" dialog for TTML files.
func (a *App) ShowTTMLSaveFileDialog(suggestedName string, defaultDir string) (string, error) {
	return wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		DefaultDirectory: defaultDir,
		DefaultFilename:  suggestedName,
		Title:            "Save TTML",
		Filters: []wailsRuntime.FileFilter{
			{
				DisplayName: "TTML Files (*.ttml)",
				Pattern:     "*.ttml",
			},
		},
	})
}

// ShowDirectoryDialog opens the native OS folder picker.
func (a *App) ShowDirectoryDialog(defaultDir string) (string, error) {
	return wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		DefaultDirectory: defaultDir,
		Title:            "Select Default Save Directory",
	})
}

// ShowOpenFileDialog opens the native OS "Open File" dialog and returns the selected file path.
func (a *App) ShowOpenFileDialog() (string, error) {
	return wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Open Project",
		Filters: []wailsRuntime.FileFilter{
			{
				DisplayName: "Composer Projects (*.composer, *.json)",
				Pattern:     "*.composer;*.json",
			},
		},
	})
}

// ReadProjectFile reads the contents of a project file directly from the disk.
func (a *App) ReadProjectFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteProjectFile saves the project data silently to the given path.
func (a *App) WriteProjectFile(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

// GetStartupProjectFilePath returns the path to a project file if the app was launched by double-clicking it.
func (a *App) GetStartupProjectFilePath() string {
	for _, arg := range os.Args[1:] {
		lower := strings.ToLower(arg)
		if strings.HasSuffix(lower, ".composer") || strings.HasSuffix(lower, ".json") {
			return arg
		}
	}
	return ""
}
