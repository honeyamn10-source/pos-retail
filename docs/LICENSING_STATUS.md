# Licensing status

This file records the licensing review for this repository. The project's own code and documentation are distributed under the [MIT License](../LICENSE). Third-party components, models, and assets are **not** covered by that MIT grant — they retain their original licenses and required notices, which remain in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Before distribution or commercial licensing, continue to:

1. Confirm ownership of the original code and assets in each release artifact.
2. Inventory dependencies and preserve the licenses/notices they require.
3. Verify that any newly added third-party module is compatible with the project's MIT licensed code.
4. Review the exact components being shipped in every kit.

## Candidate upstream projects

| Project | Observed licensing | Reuse boundary |
| --- | --- | --- |
| Browser Use | MIT | Auto Shift uses its pinned Python package; retain its notices. |
| PaddleOCR | Apache-2.0 | Candidate for OCR workloads; no migration has been performed here. Preserve applicable LICENSE and NOTICE files. |
| Medusa | MIT except identified Enterprise Edition material | Review the specific modules and ENTERPRISE-LICENSE.md before copying. |
| ERPNext | GPL-3.0 | Do not assume code can be pasted into a differently licensed product without meeting the license's requirements. |

Sources: [Browser Use](https://github.com/browser-use/browser-use/blob/0.13.10/LICENSE), [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR/blob/main/LICENSE), [Medusa](https://github.com/medusajs/medusa/blob/develop/LICENSE), [ERPNext](https://github.com/frappe/erpnext/blob/develop/license.txt).

Using an upstream dependency and rewriting an application around it are different projects. A working package does not establish that this application's integrations, payments or deployment are ready for customers.