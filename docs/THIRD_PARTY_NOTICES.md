# Third-party components and research references

The JavaScript dependency graph and exact resolutions are in `pnpm-lock.yaml`.
Keep upstream licence notices when redistributing installed dependencies.

Bundled OCR assets have their notices in `public/ocr/LICENSE-TESSERACT.md`,
`public/ocr/worker.min.js.LICENSE.txt`, and `public/ocr/core/LICENSE`.
The vendored local development plugin carries `build/sites-vite-plugin.LICENSE`.

The voice and printer adapters use public API patterns from LiveKit Agents and
python-escpos. Their packages are not bundled as Python binaries. LiveKit framework
and model licences are separate; review the specific model selected for deployment.
Dependency runtime candidates and their unverified status are in
`integrations/requirements.txt` and the validation guide.

ERPNext, OSPOS, Pipecat and the commercial POS products are research comparisons.
Their application source has not been copied into Jawa. Do not treat a research
recommendation as permission to remove third-party attribution or as a completed
licence review. The earlier planning report is preserved unchanged for continuity.
