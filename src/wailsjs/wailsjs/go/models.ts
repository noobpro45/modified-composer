export namespace activity {
	
	export class Entry {
	    id: number;
	    kind: string;
	    video_id: string;
	    started_at: number;
	    ended_at: number;
	    status: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new Entry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.kind = source["kind"];
	        this.video_id = source["video_id"];
	        this.started_at = source["started_at"];
	        this.ended_at = source["ended_at"];
	        this.status = source["status"];
	        this.message = source["message"];
	    }
	}

}

export namespace app {
	
	export class CookiesStatus {
	    present: boolean;
	    enabled: boolean;
	    path: string;
	    prefer_premium: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CookiesStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.present = source["present"];
	        this.enabled = source["enabled"];
	        this.path = source["path"];
	        this.prefer_premium = source["prefer_premium"];
	    }
	}

}

export namespace bridge {
	
	export class Bridge {
	
	
	    static createFrom(source: any = {}) {
	        return new Bridge(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}

}

export namespace bridgestate {
	
	export class Holder {
	
	
	    static createFrom(source: any = {}) {
	        return new Holder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	export class State {
	    server: string;
	    download: string;
	    downloadVideoId: string;
	    lastError: string;
	    updatePending: boolean;
	    unsavedChanges: boolean;
	
	    static createFrom(source: any = {}) {
	        return new State(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.server = source["server"];
	        this.download = source["download"];
	        this.downloadVideoId = source["downloadVideoId"];
	        this.lastError = source["lastError"];
	        this.updatePending = source["updatePending"];
	        this.unsavedChanges = source["unsavedChanges"];
	    }
	}

}

export namespace config {
	
	export class Config {
	    listen_port: number;
	    use_random_if_busy: boolean;
	    allowed_origins: string[];
	    ytdlp_channel: string;
	    ytdlp_binary_path: string;
	    open_at_login: boolean;
	    server_enabled: boolean;
	    cookies_enabled: boolean;
	    prefer_premium_audio: boolean;
	    show_menu_bar_icon: boolean;
	    max_concurrent: number;
	    audio_format: string;
	    audio_quality: string;
	    log_level: string;
	    data_dir: string;
	    download_dir: string;
	    auto_download_to_library: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.listen_port = source["listen_port"];
	        this.use_random_if_busy = source["use_random_if_busy"];
	        this.allowed_origins = source["allowed_origins"];
	        this.ytdlp_channel = source["ytdlp_channel"];
	        this.ytdlp_binary_path = source["ytdlp_binary_path"];
	        this.open_at_login = source["open_at_login"];
	        this.server_enabled = source["server_enabled"];
	        this.cookies_enabled = source["cookies_enabled"];
	        this.prefer_premium_audio = source["prefer_premium_audio"];
	        this.show_menu_bar_icon = source["show_menu_bar_icon"];
	        this.max_concurrent = source["max_concurrent"];
	        this.audio_format = source["audio_format"];
	        this.audio_quality = source["audio_quality"];
	        this.log_level = source["log_level"];
	        this.data_dir = source["data_dir"];
	        this.download_dir = source["download_dir"];
	        this.auto_download_to_library = source["auto_download_to_library"];
	    }
	}

}

export namespace library {
	
	export class Track {
	    id: number;
	    video_id: string;
	    title: string;
	    artist: string;
	    album: string;
	    release_year: number;
	    duration_sec: number;
	    thumbnail_url: string;
	    thumb_path: string;
	    is_music: boolean;
	    music_type: string;
	    source_url: string;
	    imported_at: number;
	    audio_path: string;
	    audio_size: number;
	
	    static createFrom(source: any = {}) {
	        return new Track(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.video_id = source["video_id"];
	        this.title = source["title"];
	        this.artist = source["artist"];
	        this.album = source["album"];
	        this.release_year = source["release_year"];
	        this.duration_sec = source["duration_sec"];
	        this.thumbnail_url = source["thumbnail_url"];
	        this.thumb_path = source["thumb_path"];
	        this.is_music = source["is_music"];
	        this.music_type = source["music_type"];
	        this.source_url = source["source_url"];
	        this.imported_at = source["imported_at"];
	        this.audio_path = source["audio_path"];
	        this.audio_size = source["audio_size"];
	    }
	}

}

export namespace updater {
	
	export class Asset {
	    url: string;
	    sha256: string;
	
	    static createFrom(source: any = {}) {
	        return new Asset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.sha256 = source["sha256"];
	    }
	}
	export class UpdateInfo {
	    available: boolean;
	    current: string;
	    latest: string;
	    // Go type: time
	    released_at: any;
	    notes: string;
	    asset: Asset;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.current = source["current"];
	        this.latest = source["latest"];
	        this.released_at = this.convertValues(source["released_at"], null);
	        this.notes = source["notes"];
	        this.asset = this.convertValues(source["asset"], Asset);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace ytdlp {
	
	export class VerifyResult {
	    loaded: boolean;
	    authenticated: boolean;
	    rotated: boolean;
	    detail: string;
	
	    static createFrom(source: any = {}) {
	        return new VerifyResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.loaded = source["loaded"];
	        this.authenticated = source["authenticated"];
	        this.rotated = source["rotated"];
	        this.detail = source["detail"];
	    }
	}

}

