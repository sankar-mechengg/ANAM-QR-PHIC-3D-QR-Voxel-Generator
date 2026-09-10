# ANAM[QR]PHIC

**3D Printable Voxel Diorama QR code.**

An anamorphic voxel QR studio. At eye level you get a 3D diorama — a cherry blossom,
a pagoda, a snowman — standing on a raised plate. Tap it and the camera flies to
straight overhead while the avatar sinks into the plate and takes each module's
colour, until the whole scene resolves into a scannable QR code. Tap again and it
drops back into 3D. The model you see is one watertight solid you can export and
print directly.

Named for [anamorphosis](https://en.wikipedia.org/wiki/Anamorphosis) — art that only
resolves from one particular viewpoint. Here that viewpoint is the zenith.

```text
   3D diorama              2D code
                                      
      🌸  avatar     →      ▛▘▚▘▖ ▘▚
    ▓▓▓▓▓  plate            ▘▚▛ ▘▚▛▘
                            ▛▘▚▘▖ ▘▚
```

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
npm run lint
```

## The model

There is one scene and one model; 2D and 3D are two camera angles on it.

Everything is an integer voxel lattice of full 1.0 cubes, so faces meet exactly:

| level | contents |
| --- | --- |
| `y = 0` | solid base slab under the whole plate. Also the surface of every light module, and of the photo inset. |
| `y = 1..h` | dark module caps, `h` of 1 or 2 for side-on texture |
| `y = 1` | the embossed name, on its own band below the code |
| `y >= 1` | the avatar, re-seated so its lowest voxel rests on the slab |

`src/utils/voxelModel.js` builds it. The slab grounds every cap, the avatar's feet
touch the slab, and `buildSupports()` flood-fills from `y = 0` and drops a column
under any component still floating — a golem's crystal core, a deer's antlers, a
palm's fronds. It repeats until nothing is loose, because one column can land on
another loose component.

Structure is separated from colour so a hue-slider drag never re-runs the
support solver.

## Name plate

A name typed in the left panel is rasterised through a 5x7 voxel font
(`src/data/voxelFont.js`) and raised on its own band below the code, clear of the
quiet zone, grounded on the same slab — so it prints as part of the one body.

Long names wrap rather than stretching the plate. Without wrapping a 24-character
name is 144 modules wide, and a small code ends up a stamp in the middle of a
letterbox; the wrap limit tracks about 1.45x the code width.

## Photo inset

A browsed photo is centre-cropped, sampled to one colour per module, and laid flat
into the middle of the plate. It survives because error correction level H absorbs
the loss — but a flat fraction does not work.

Measured decode limits with a full-colour photo:

| code | max inset | of area |
| --- | --- | --- |
| 21x21 | 5 modules | 5.7% |
| 25x25 | 8 modules | 10.2% |
| 29x29 | 10 modules | 11.9% |
| 49x49 | 21 modules | 18.4% |
| 65x65 | 31 modules | 22.7% |

Small versions are mostly fixed pattern (finders, timing, format) so they can spare
far less. `logoModules()` tracks about 75% of the measured limit. A flat 30% cost
version 1 its readability entirely, which is what the sweep was written to catch.

## Printing

`src/utils/exporters.js` does real surface extraction: a face is emitted **only**
where the neighbouring lattice cell is empty. No internal walls, no coincident
faces, no gaps. STL is binary (an ASCII STL of a large code runs to tens of MB);
OBJ carries per-vertex colour for Blender.

At 2 mm per voxel a 37-module code prints 86 × 28 × 86 mm.

Audited independently from the exported bytes:

```text
open (boundary) edges: 0          -> watertight, holds water
edges with unbalanced winding: 0  -> consistently oriented
degenerate triangles: 0
signed volume: 23248.0 mm^3       -> solid, normals point outward
```

The one thing that cannot be removed is **edge pinches** — two dark modules meeting
only along an edge, wherever the code puts them diagonally with light modules
between. Every QR relief has them; filling one would flip a module and corrupt the
code. The solid stays closed there and both towers are anchored to the slab, so
slicers handle it. `inspectSurface()` reports pinches separately from holes for
exactly this reason.

## Making the zenith view actually scan

Three things fight the code from above, all handled as the camera rises:

| Problem | Fix |
| --- | --- |
| Auto-spin leaves the code rotated | the group unwinds to the nearest square-on turn |
| A raking key light throws pillar shadows across light modules | the key swings to near-vertical |
| Ambient + key + fill + a warm overhead point sum to ~2.2 incident, lifting dark modules toward white | total exposure pulls back to ~1.0, so the plate reads as flat albedo |

The coloured palettes shift hue per module. At a fixed HSL lightness some modules
land on bright yellow and others on deep blue, and a scanner has no single threshold
to binarise against. `moduleTone()` keeps the hue drift but pins every dark module
to one perceived luminance (`DARK_LUMA` in `App.jsx`). Raising it brightens the
palettes at the cost of the contrast the zenith view depends on.

Voxels never yaw on their own axis. They used to, and it scrambled the code so it
only read from one angle; whole-model rotation lives on the group instead. The
animation modes are vertical choreography only.

## Rendering

Two `InstancedMesh`es — plate and avatar — with scale+translation matrices written
straight into the instance buffer. A 105-module code is 18,000+ boxes.

`CameraRig` holds a 0..1 `revealRef` that every voxel reads each frame. The camera
pose is a *pure function* of that progress between the saved orbit pose and straight
overhead, so the descent retraces the climb exactly. It also frames the whole plate
on load, on resize, on a code-size change, on a projection swap, and on **Fit**.

## Verified

Decoded straight off the live WebGL canvas at the zenith with `jsQR`:

- all 25 avatars, each sunk into the plate
- all five palettes, hue swept across the full range
- code sizes 21×21, 29×29, 69×69, 101×101
- both perspective and isometric projections
- with an embossed name, with a photo inset, and with both at once

Plus: every avatar produces a closed, fully grounded solid with zero holes; the
exported STL passes an independent byte-level audit; panes collapse and give the
canvas space back; zoom ranges from 1.8% to 96% screen coverage and **Fit** restores
the framing exactly.

## Other bits

- Each side pane scrolls inside itself, so 25 avatar cards never stretch the page.
- **Record** captures the canvas to WebM at 60 fps.
- The golden portal tile glows in the diorama and fades to its true module colour on
  the way up, so the code that scans is never contaminated.

Built with Vite, React, three.js and @react-three/fiber.

Made by [Sankar](https://www.linkedin.com/in/sankar4/).
