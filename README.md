# GRIS - Google Reverse Image Search

This is a small node module (with not so small dependencies) to find image results from Google
based on existing image.

Reverse image search can be performed from file or from uri.

Results contain image image uri, page where the image is found, and image dimensions.

## Example usage

```typescript
import { GRIS, SearchResult } from "google-reverse-image-search";

new GRIS().ready.then((gris) => {
  gris.searchByFile("index.jpeg", 0).then((results: SearchResult[]) => {
    console.log(results);
    gris.kill();
  });
});
```

## API

class **GRIS**

- property **ready**: Promise<GRIS>
  - resolves with object itself once all the initialization is done. Do not call other methods before this resolves.
- method **searchByFile(imagePath: string, page: 0)**: Promise<SearchResult[]>
  - perform reverse image search using local file located at *imagePath*. *page* is a zero-based index of result page.
- method **searchByUrl(url: string, page: number)**: Promise<SearchResult[]>
  - perform reverse image search using remote image located at *url*. *page* is same as for **searchByFile**.
- method **kill()**: Promise<void>
  - free resources, kill chromium, and clean up. Call this when you are done searching.

interface **SearchResult**

- property **image**: string
  - remote image uri.
- property **page**: string
  - web page where the remote image is found.
- property **width**: number
  - remote image width in pixels.
- property **height**: number
  - remote image height in pixels.

 ## Abuse

 Google does not provide an API for reverse image search and programatic usage of this service is against the TOS.
 Use at your own risk.

  Note:
  Heavy usage of this module may result in captchas being thrown which WILL BREAK this module.
