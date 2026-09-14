# Licensing status

This file records the current documentation review. It does not grant a new license to this repository or certify every dependency and asset for redistribution.

No root project license was found during this review. Existing third-party notices remain in place. Before distribution or commercial licensing, confirm ownership of the original code and assets, inventory dependencies, preserve required notices, and review the exact components being shipped.

## Candidate upstream projects

| Project | Observed licensing | Reuse boundary |
| --- | --- | --- |
| Browser Use | MIT | Auto Shift uses its pinned Python package; retain its notices. |
| PaddleOCR | Apache-2.0 | Candidate for OCR workloads; no migration has been performed here. Preserve applicable LICENSE and NOTICE files. |
| Medusa | MIT except identified Enterprise Edition material | Review the specific modules and ENTERPRISE-LICENSE.md before copying. |
| ERPNext | GPL-3.0 | Do not assume code can be pasted into a differently licensed product without meeting the license's requirements. |

Sources: [Browser Use](https://github.com/browser-use/browser-use/blob/0.13.10/LICENSE), [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR/blob/main/LICENSE), [Medusa](https://github.com/medusajs/medusa/blob/develop/LICENSE), [ERPNext](https://github.com/frappe/erpnext/blob/develop/license.txt).

Using an upstream dependency and rewriting an application around it are different projects. A working package does not establish that this application's integrations, payments or deployment are ready for customers.
