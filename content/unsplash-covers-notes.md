# Unsplash cover pool

The canonical 200-photo URL catalog is `web/src/lib/unsplash-covers.json`.
The API embeds this same file at build time; the web editor uses it for previews.
URLs were verified with HTTP HEAD on 2026-09-09. All 200 are distinct landscape photos.

Metadata source: https://huggingface.co/datasets/image-search-2/unsplash_lite_image_dataset
Original dataset: https://github.com/unsplash/datasets
Photo license: https://unsplash.com/license
Each entry retains its Unsplash photo page, photographer profile and description.
No photos are downloaded into the application. Image loading uses images.unsplash.com.

On article save, missing covers are assigned randomly from least-used catalog entries.
The URL is stored in Articles.CoverUrl, so title/slug edits do not reassign it.
The admin replacement button requests a preview; only saving persists that choice.
Existing blank/legacy placeholder covers are assigned once on API startup.
