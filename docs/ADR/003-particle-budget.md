# ADR 003 — Particle Budget

## Decision

Use a 25,000–125,000 particle range. The default density maps to approximately
80,000 candidates before transparency and subject-weight filtering. This keeps
individual particles visually separable instead of merging into a flat image.

All particles are rendered with one Three.js `Points` object and one custom
ShaderMaterial. Each point has a bright emissive core and a soft color-preserving
halo. Subject pixels also create five sparse depth samples between the visible
surface and a recessed background depth; this prevents a large empty cavity from
appearing behind the subject when the scene rotates. Floating, Gather/Scatter,
Wave, depth strength, point size and background opacity are computed in shaders.

## Consequence

Changing density rebuilds buffers. The other five visual settings update shader
uniforms without rebuilding the scene.
