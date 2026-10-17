# Wablo Opticals — standalone live AR try-on

A mobile-first, static GitHub Pages website for testing a **single optical store**. Upload spectacle product photos, optionally remove the background, upload images to Cloudinary, and generate unique shareable try-on links. Customers open a link on their phone and use live camera face tracking to preview the spectacle frame.

## No Supabase, database, or custom backend

- GitHub Pages hosts the website.
- Cloudinary's unsigned image-upload preset stores public product images.
- Each try-on URL contains the product name, price, colour, and Cloudinary image URLs in its query string. Therefore, that exact product page works on another phone without looking up a database record.
- The owner's catalogue list is saved in the current browser's `localStorage`. Use **Export catalogue** and **Import catalogue** to back it up or move it to another device. Product links already shared keep working independently of this local catalogue.
- Camera video and face landmarks are processed in the customer's browser. The app does not upload or record camera video.

## 1. Configure free Cloudinary image hosting

1. Create/sign in to a Cloudinary account: https://cloudinary.com/users/register/free
2. In the Cloudinary Console, find your **Cloud name**.
3. Open **Settings → Upload → Upload presets** and create an upload preset.
4. Set **Signing Mode** to **Unsigned**, save the preset, and copy its exact name.
5. For the pilot, restrict the preset to image formats you need and set reasonable file-size limits if those options are available. The app limits selected files to 12 MB.
6. The project is prefilled with the provided Cloudinary cloud name `zvcdiolh` and unsigned preset `wablo_opticals`. Open Wablo Opticals → **Store studio**, confirm those values, then tap **Save image settings**.

Security note: unsigned upload presets are public browser configuration, not secrets. Someone who discovers the preset could try to upload files to your Cloudinary account. Restrict formats/size and monitor usage. Do not put Cloudinary API secrets in this static website.

## 2. Publish on GitHub Pages

1. Create a **public** repository named `wablo-opticals` under your GitHub account.
2. Upload the files in this folder directly to the repository root: `index.html`, `styles.css`, `app.js`, `.nojekyll`, and `README.md`.
3. In the repository, open **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main` and `/(root)`, then save.
5. Wait for the Pages deployment. Your URL will look like `https://YOUR_USERNAME.github.io/wablo-opticals/`.
6. Open that HTTPS URL on your phone. Camera permission only works on HTTPS or localhost.

## 3. Add a spectacle and share the link

1. Open **Store studio**.
2. Configure Cloudinary if you have not already.
3. Enter the frame name, price, colour, and select a product photo.
4. Best result: use a clean, front-facing **transparent PNG** of the spectacles. You can tap **Prepare frame overlay** to attempt browser-based background removal, but thin spectacle arms and clear lenses can be difficult to isolate. Review the result.
5. Tap **Save frame & create link**. The app uploads the catalogue photo and (if prepared) overlay to Cloudinary, stores the product in this browser, then opens the phone's native share sheet. Choose WhatsApp.
6. Share the product image and link. If your phone's share sheet cannot attach the image and link together, send the image in WhatsApp and paste the generated link in the same chat. You can also tap **Copy link** in the studio.
7. The customer opens the link, taps **Try this frame live**, grants camera permission, and adjusts the frame-size slider if needed.

## How the AR works and its limits

The browser uses MediaPipe Face Landmarker and eye-corner landmarks to align a 2D transparent spectacle image over the eyes. This is not a full 3D optical simulation, does not measure pupillary distance, and does not guarantee frame fit or prescription accuracy. A product photo with a white/solid background will show a rectangle if background removal is unsuccessful. A transparent overlay is strongly recommended.

## WhatsApp previews

GitHub Pages serves one static HTML document, so it cannot generate unique server-side Open Graph metadata for every product URL. WhatsApp may show a generic site preview instead of the uploaded product image. The share flow attempts to attach the product image via the phone's native share sheet; if that is not supported, send the image and link together manually. To guarantee automatic image thumbnails on every link, a server/edge function that returns per-product Open Graph tags would be required.

## Catalogue backup

The saved product list is local to the browser used for the Store Studio. Export the catalogue JSON regularly. Importing the JSON on another device restores the dashboard list; it does not re-upload the image files because the images already live on Cloudinary.

## Files

- `index.html` — store, studio, product detail and try-on views
- `styles.css` — responsive design
- `app.js` — Cloudinary uploads, local catalogue, portable product links, sharing and face tracking
- `.nojekyll` — GitHub Pages static-site marker
