# Partner logos

Drop the partner logo files here using these exact filenames — `index.html` already
points at them:

| File | Partner |
| --- | --- |
| `young-achievers.svg` | Young Achievers Foundation |
| `princeton.svg` | Princeton University |

Guidelines:

- **SVG preferred.** If you only have raster art, use a transparent-background PNG at
  roughly 2x the display size (the tiles render logos at 48px tall, so ~96px tall) and
  update the `src` in `index.html` to `.png`.
- **Transparent background.** The tiles sit on `--paper` and shift to `--cream` on hover,
  so a white box behind the logo will show as a visible rectangle.
- Logos are sized by height (48px) with automatic width, so wide wordmarks and tall
  shields end up optically balanced. If one still looks too big or small next to the
  other, add a per-logo tweak in `styles.css` rather than re-exporting the file.
