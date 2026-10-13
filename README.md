<div align="center">

<sub>A SKILL FOR CLAUDE CODE</sub>

# Folio

*Explain an idea the way a museum explains a specimen.*

Three-dimensional isometric technical drawings that you can control and inspect from every angle.<br>
Live simulations of electricity, magnetism, and energy flows.<br>
Internal components that actually rotate, shift, and interact, not just static visuals.

[The collection](#the-collection) · [Install](#ii-install) · [Commission a plate](#iii-commission-a-plate) · [Anatomy of a plate](#iv-anatomy-of-a-plate) · [Make your own](#v-make-your-own)
<img width="1776" height="896" alt="Untitled design" src="https://github.com/user-attachments/assets/ee106ff7-05df-4765-a7d2-03b81f1fc639" />

<br>

## The Results

<img width="600" height="468" alt="folio-plates" src="https://github.com/user-attachments/assets/0dab0a23-f2fc-4230-8ef8-5bef5288fd94" />

<br>

## Three views of every plate

Each plate has a switch in its top corner: **SVG · WebGL · 3D**, plus two ways to look closer: press any numbered pin for a zoomed view of that part with its live reading, or turn on the **Loupe** to magnify the bench under your pointer.

<table>
<tr>
<td width="33%" valign="top"><img src="docs/img/view-svg.png" alt="Plate II in the SVG view"></td>
<td width="33%" valign="top"><img src="docs/img/view-webgl.png" alt="Plate II in the WebGL view, dark theme, with glowing vessels and light on the bench"></td>
<td width="33%" valign="top"><img src="docs/img/view-3d.png" alt="Plate I in the 3D view, turned to show the bench from the left"></td>
</tr>
<tr>
<td valign="top"><b>SVG</b><br><sub>The engraved drawing: solid parts, tones by facing, hatching that follows the shade.</sub></td>
<td valign="top"><b>WebGL</b><br><sub>Light over the drawing. Pulses run along vessels at the true flow, fluid glows with its value, and rippled light falls across the bench. A mask rendered from the drawing keeps the light off anything hidden.</sub></td>
<td valign="top"><b>3D</b><br><sub>Drag to turn the bench all the way round, and look at it from behind or from above. Every part is re-projected, re-shaded and re-ordered from the new angle. Double-click to reset.</sub></td>
</tr>
</table>

<table>
<tr>
<td width="50%" valign="top"><img src="docs/img/grid-webgl.png" alt="Plate III in the WebGL view, dark theme: current waves on the conductors, a glowing transformer core and lit windows in the town"></td>
<td width="50%" valign="top"><img src="docs/img/grid-turned.png" alt="Plate III turned in 3D to show the generator and transformers from another side"></td>
</tr>
<tr>
<td valign="top"><b>Energy you can see</b><br><sub>Current runs along the wires at the true power, the transformer cores glow with flux, the conductors warm with their losses, and the town's windows dim when the line cannot keep up.</sub></td>
<td valign="top"><b>Parts that move</b><br><sub>The water wheel, shaft and rotor turn at the machine's real speed, the governor's balls fly out as it speeds up, and the breaker lifts when protection trips. Slow the grid down and you watch it slow.</sub></td>
</tr>
</table>

<br>

## I. The idea

Most technical diagrams are boxes and arrows. They name the parts but leave the motion to your imagination.

A Folio plate turns the idea into an instrument whose working parts carry it out, then mounts that instrument the way a museum would. You can read it as an engraving, light it with WebGL, or turn it in 3D, and its internal parts move as the model runs. Each part gets a numbered pin, a catalogue key says what each pin computes, and four wall texts walk through the math with live numbers.

In Plate I, eight glass columns stand for eight words. A sealed reservoir holds exactly one unit of fluid and shares it between the columns by softmax, so the columns always sum to one because the reservoir never holds more. The shares settle as layers in a tray, and the length of each layer is that word's attention weight.

Every plate keeps three commitments:

| | |
|:--|:--|
| **Mechanism, not metaphor** | The instrument performs the idea. The fluid is the probability mass. |
| **A single source of numbers** | One small model drives the needles, the readout, the key and the tables, so they cannot disagree. |
| **A guided reading** | A numbered key, a term-by-term reading, the full working, and an honest note on what was simplified. |

<br>

## II. Install

```bash
npx skills add Ramakm/folio-anatomy -g -a claude-code
```

This installs Folio for every project, in `~/.claude/skills/folio`. Leave out `-g` to install it only into the current project.

<details>
<summary>Install with git instead</summary>

<br>

```bash
# for you, in every project
git clone https://github.com/Ramakm/folio-anatomy.git ~/.claude/skills/folio

# for one project, shared with everyone who works on it
git clone https://github.com/Ramakm/folio-anatomy.git .claude/skills/folio
```

If the `skills` folder did not exist when your session started, run `/reload-skills`.

</details>

<br>

## III. Commission a plate

Name the idea, not the drawing:

```
/folio explain how a hash map resolves collisions        (this became Plate IV)
/folio explain backpropagation through a single neuron, for a course page
/folio how does consistent hashing move keys when a server joins
/folio explain the KV cache in LLM inference, dark theme
/folio design the human heart anatomy
```

```
/folio simulate how a power grid keeps 50 Hz
/folio explain how an electric motor turns
```

Claude works in four phases:

| Phase | What happens |
|:--|:--|
| **Brief** | States the scope and time. Writes the model first and tests it. Proposes an instrument and a correspondence table: *term → part → what you see*. |
| **Bench** | Lays out the parts in depth bands, builds the static geometry once, and draws the moving parts in live slots. Places the numbered pins. |
| **Mount** | Builds the exhibition page: title block, mounted plate, key, controls, and four wall texts. |
| **Proof** | Takes light, dark and phone screenshots plus enlarged crops, then checks every number against the model. |

You don't have to type `/folio`. Any request for an explanatory figure or interactive explainer can pick the skill up.

<br>

## IV. Anatomy of a plate

<table>
<tr>
<td width="50%" valign="top">

**The drawing is engraved.**
Faces are toned by how they face the light, and round parts are hatched more densely toward their shadow side, so they read as turned metal. Warm grey for the instrument, one red for the quantity being explained.

</td>
<td width="50%" valign="top">

**The page is curated.**
Wall text I reads the formula one term at a time, pointing at pins by number. Its live working box updates as you turn the knobs.

</td>
</tr>
<tr>
<td><img src="docs/img/detail.png" alt="Close-up of the glass columns, stopcocks and key dials, with numbered pins"></td>
<td><img src="docs/img/wall-text.png" alt="Wall text I: Compare, Scale, Normalise, Blend, each with live numbers"></td>
</tr>
</table>

A finished plate has, top to bottom:

1. **Masthead and title block.** The idea named as its instrument, with a catalogue list: Object, Idea, Model, Catalogue.
2. **The mounted plate.** Corners carry the plate number, the caption, the interaction hint and a live readout.
3. **The key.** One entry per pin. Hovering an entry highlights its pin, and hovering a pin highlights its entry.
4. **At the bench.** Ordinary controls that match the instrument's knobs.
5. **Wall text I, reading the plate.** One column per term of the formula.
6. **Wall text II, the ledger.** The full working, row by row.
7. **Wall text III, the wider view.** The full matrix, sequence or table the plate shows one slice of.
8. **Wall text IV, about this specimen.** What is exact, what was chosen by hand, and what was left out.

<br>

<table>
<tr>
<td width="50%"><img src="docs/img/plate-i-light.png" alt="Plate I, light theme"></td>
<td width="50%"><img src="docs/img/plate-i-dark.png" alt="Plate I, dark theme"></td>
</tr>
<tr>
<td align="center"><sub>Gallery light</sub></td>
<td align="center"><sub>Gallery dark</sub></td>
</tr>
</table>

Every colour is a CSS custom property. Plates open in gallery light, and a **Dark** switch in the masthead turns the lights down; the choice is remembered across every page and embedded plate. To use your own brand, swap the token block at the top of `page.html`. The structure and the engraving stay the same.

<br>

## V. Make your own

```bash
npm install                                   # Playwright, for the screenshot checks
node scripts/new-plate.mjs kv-cache           # copies Plate I into examples/kv-cache
# rewrite model.js, plate.js, page.html and page.js
node scripts/build.mjs examples/kv-cache dist/kv-cache.html
node scripts/capture.mjs dist/kv-cache.html shots
```

`capture.mjs` saves light, dark and phone screenshots. `--crop x,y,w,h` adds an enlarged crop, and `--eval "Plate.update({ q: 3, head: 1 })"` captures a particular state. It also reports console errors and any sideways scrolling.

<br>

## Acknowledgement

Folio was inspired by [Anatomy](https://github.com/wheresryan22/anatomy) by Ryan, which first showed that Claude can draw an idea as a working isometric machine. Folio is an independent project. Its code, drawing library, skill text and plates were all written from scratch, with a different focus: museum-style curation, a numbered key and wall texts, engraved shading, and a written account of what each plate simplifies.

<br>

<div align="center">

<sub>MADE BY</sub>

**Ramakrushna Mohapatra**

[Instagram @techwith.ram](https://www.instagram.com/techwith.ram/) · [X @techwith_ram](https://x.com/techwith_ram)

<sub>MIT License · 2026</sub>

</div>
