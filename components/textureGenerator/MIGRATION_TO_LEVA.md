# Migration to Leva Controls

## Summary

All texture generator controls have been migrated from HTML form elements to Leva's interactive GUI panel. This consolidates the entire interface into a single, cohesive control system.

## Changes Made

### TextureCanvas.tsx

#### Added:

1. **Export Settings folder** in Leva with:
   - `resolution`: Dropdown with options [1024, 2048, 4096]
   - `seed`: Number input (0-999999)
   - `download`: Button that triggers `captureHighResTexture()`

2. **Imported `button` helper** from Leva for creating the download button

#### Removed:

- DOM queries for `#resolution-select` and `#seed-input`
- `useEffect` hook for download button click handler (Leva handles it)

#### Modified:

- `captureHighResTexture()` now reads from `exportSettings.resolution` and `exportSettings.seed` instead of DOM elements
- `useFrame` hook reads seed from `exportSettings.seed` instead of DOM

### page.tsx

#### Removed:

- Entire sidebar `<aside>` element with HTML controls
- `EXPORT_RESOLUTIONS` constant (now defined in Leva)
- Resolution dropdown, seed input, and download button

#### Simplified:

- Layout now shows just header and canvas
- Header updated with instructions to use Leva panel

## Benefits

1. **Unified Interface**: All controls in one place (Leva panel)
2. **Better UX**: Leva provides consistent styling, keyboard input, drag support
3. **Cleaner Code**: No DOM manipulation, no manual event handlers
4. **Real-time Feedback**: Leva controls update immediately in preview
5. **Collapsible Folders**: Users can organize their workspace by collapsing control groups

## Leva Panel Structure

```
📁 Export Settings
  ├─ Resolution: [1024, 2048, 4096]
  ├─ Seed: 0 (0-999999)
  └─ [Download JPG] button

📁 Grainy Noise
  ├─ Scale: 256 (32-1024)
  ├─ Amplitude: 1.5 (0-5)
  └─ Mix Amount: 0.1 (0-1)

📁 Fractal Noise (FBM)
  ├─ Scale: 2.0 (0.5-16)
  ├─ Octaves: 4 (1-8)
  ├─ Lacunarity: 2.0 (1-4)
  ├─ Gain: 0.5 (0.1-1)
  └─ Mix Amount: 0.5 (0-1)

📁 Vignette
  ├─ Strength: 0.3 (0-1)
  ├─ Radius: 0.5 (0-1)
  └─ Smoothness: 0.5 (0-1)
```

## Usage

1. Navigate to `/dev/texture-generator`
2. Adjust parameters using the Leva panel on the right
3. Preview updates in real-time
4. Click "Download JPG" in Export Settings to export at selected resolution

## Technical Notes

- The Leva `button()` helper requires a callback function
- Export controls are defined first to ensure `captureHighResTexture` can reference them
- Dependencies in `useCallback` include `exportSettings.resolution` and `exportSettings.seed` for proper closure capture
