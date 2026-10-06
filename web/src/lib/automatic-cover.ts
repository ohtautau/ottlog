import photos from "./unsplash-covers.json";

// Preview only. The API saves a random choice on the article itself.
export function automaticCover(slug:string) {
  let hash=2166136261;
  for(let i=0;i<slug.length;i++)hash=Math.imul(hash^slug.charCodeAt(i),16777619)>>>0;
  return photos[hash%photos.length].url;
}
