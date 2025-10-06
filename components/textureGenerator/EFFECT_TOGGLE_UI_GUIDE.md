# Effect Toggle UI Example

## Leva Panel Layout

```
┌─────────────────────────────────────────┐
│ 📁 Export Settings                      │
│   Resolution: [1024 ▼]                  │
│   Seed: [42        ]                    │
│   [Download JPG]                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📁 Grainy Noise                         │
│   Enabled: [✓]  ← Toggle here          │
│   Scale: ●────────────○ 256             │
│   Amplitude: ●───────○ 1.5              │
│   Mix Amount: ●──○ 0.1                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📁 Fractal Noise (FBM)                  │
│   Enabled: [✓]  ← Toggle here          │
│   Scale: ●────────○ 2.0                 │
│   Octaves: ●────○ 4                     │
│   Lacunarity: ●────○ 2.0                │
│   Gain: ●────────○ 0.5                  │
│   Mix Amount: ●────────○ 0.5            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📁 Vignette                             │
│   Enabled: [✓]  ← Toggle here          │
│   Strength: ●────────○ 0.3              │
│   Radius: ●────────○ 0.5                │
│   Smoothness: ●────────○ 0.5            │
└─────────────────────────────────────────┘
```

## User Workflows

### Workflow 1: Quick A/B Testing

**Goal:** Compare texture with and without grain

1. Click `Enabled` toggle in "Grainy Noise" folder
   - Result: Grain effect disappears instantly
   - All settings (Scale, Amplitude, Mix) preserved
2. Adjust other effects while grain is disabled
   - Vignette, FBM still working normally
3. Toggle grain back on
   - Settings restore exactly as they were
   - No need to remember or re-adjust values

### Workflow 2: Building Up Effects

**Goal:** Start simple, add complexity gradually

1. **Disable all effects** (uncheck all Enabled toggles)
   - See base gradient only
2. **Enable Vignette** only
   - Check "Vignette → Enabled"
   - Adjust strength/radius for frame
3. **Add FBM** layer
   - Check "Fractal Noise → Enabled"
   - Tune octaves/lacunarity
4. **Add subtle grain** last
   - Check "Grainy Noise → Enabled"
   - Keep Mix Amount low (0.05)

### Workflow 3: Export Variations

**Goal:** Export same design with different effect combinations

1. Set up all effects with perfect settings
2. **Export base version:**
   - Disable: Grain, FBM
   - Keep: Vignette
   - Click "Download JPG"
3. **Export detailed version:**
   - Enable: All effects
   - Click "Download JPG"
4. **Export minimal version:**
   - Disable: Vignette
   - Enable: FBM only (low mix)
   - Click "Download JPG"

All settings preserved between exports!

## Interaction Details

### Toggle Behavior

**When Enabled (✓):**

- Checkbox shows checkmark
- Effect contributes to final image
- Mix/Strength slider controls effect intensity
- All parameters adjustable with real-time preview

**When Disabled (unchecked):**

- Checkbox shows empty
- Effect has ZERO contribution (mix = 0 sent to shader)
- Sliders still adjustable (for quick tweaking before re-enabling)
- Settings preserved in Leva state

### Visual Feedback

The preview canvas updates instantly when toggling:

- ✓ → unchecked: Effect fades out as mix → 0
- unchecked → ✓: Effect fades in as mix → user value

No lag, no re-compilation, just smooth transition.

## Keyboard Shortcuts

Leva provides built-in shortcuts:

- **Space** on toggle: Toggle on/off
- **Tab**: Navigate between controls
- **Arrow keys** on sliders: Fine-tune values
- **Shift + Arrow** on sliders: Coarse adjustments

Users can quickly navigate:

1. Click "Grainy Noise → Enabled"
2. Press **Space** to toggle
3. Press **Tab** to move to Scale
4. Use **Arrow keys** to adjust
5. Press **Space** again to toggle back

## Multi-Effect Comparison

Example use case: "Which effects work best for this seed?"

```
Seed: 12345

Test 1: FBM only
  fbmEnabled: ✓
  grainEnabled: ☐
  vignetteEnabled: ☐
  → Too soft, needs more texture

Test 2: FBM + Grain
  fbmEnabled: ✓
  grainEnabled: ✓
  vignetteEnabled: ☐
  → Better! Grain adds detail

Test 3: FBM + Grain + Vignette
  fbmEnabled: ✓
  grainEnabled: ✓
  vignetteEnabled: ✓
  → Perfect! Frame adds focus
```

Quick toggles make this workflow fast and intuitive.

## Future: Preset Shortcuts

Could add preset buttons for common combinations:

```
┌─────────────────────────────────────────┐
│ 📁 Export Settings                      │
│   [Minimal]  [Standard]  [Detailed]    │
│   └─────────┘                           │
│     ↓                                   │
│   Clicks "Standard" preset:             │
│   • Grain: ☐                            │
│   • FBM: ✓                              │
│   • Vignette: ✓                         │
└─────────────────────────────────────────┘
```

Presets just set the `enabled` toggles + parameter values in one action.

## Accessibility

The toggle pattern is screen-reader friendly:

- Clear "Enabled" label
- Standard checkbox semantics
- Immediate visual feedback
- Keyboard navigable

Example screen reader output:

> "Grainy Noise folder. Enabled, checkbox, checked. Scale, slider, 256. Amplitude, slider, 1.5. Mix Amount, slider, 0.1."

User can navigate entirely by keyboard and hear current state.
