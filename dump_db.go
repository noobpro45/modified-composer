//go:build ignore

package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func main() {
	home, _ := os.UserHomeDir()
	dbPath := filepath.Join(home, ".composer-bridge", "library.db")
	fmt.Println("DB Path:", dbPath)

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT video_id, audio_path, audio_size FROM tracks")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Tracks:")
	for rows.Next() {
		var vid, path string
		var size int64
		if err := rows.Scan(&vid, &path, &size); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("video_id: %q | audio_path: %q | audio_size: %d\n", vid, path, size)
	}

	actDbPath := filepath.Join(home, ".composer-bridge", "activity.db")
	fmt.Println("\nActivity DB Path:", actDbPath)
	actDb, err := sql.Open("sqlite", actDbPath)
	if err == nil {
		defer actDb.Close()
		actRows, err := actDb.Query("SELECT id, kind, video_id, status, message, started_at, ended_at FROM activity ORDER BY started_at DESC LIMIT 5")
		if err == nil {
			defer actRows.Close()
			fmt.Println("Recent Activities:")
			for actRows.Next() {
				var id int64
				var kind, vid, status, msg string
				var sat, eat int64
				actRows.Scan(&id, &kind, &vid, &status, &msg, &sat, &eat)
				fmt.Printf("id: %d | kind: %q | video_id: %q | status: %q | message: %q\n", id, kind, vid, status, msg)
			}
		} else {
            fmt.Println("Query error:", err)
        }
	}
}
