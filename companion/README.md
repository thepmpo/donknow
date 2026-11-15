# Duck computer companion

This is the executable local/cloud-host adapter for Duck jobs, not a remote installation performed on a user's machine. Setup, OS permissions, model/channel activation, and verified limitations are in [the setup guide](../docs/dots-full-setup-2026-11-15.md).

Requirements: Node24 and Docker Linux containers. Build the optional images with `node companion/build-browser.mjs` and `python3 companion/build-code.py`. Pair a device created in Duck → Tasks → Computer using `node companion/connect.mjs --server https://duckduck-test.onrender.com --id DEVICE_ID --pair ONE_TIME_CODE`. Keep the process running; Ctrl+C aborts current execution. Subsequent runs use the protected local connection file.

Docker code has no network or host secrets. The browser has a dedicated persistent profile and a public HTTP(S) egress proxy. Inputs are selected owned artifacts; outputs are returned to the same owner/job. Never pass provider passwords or API tokens through the chat. Use private takeover for login. Desktop is an explicit additional permission and requires OS-level access. Optional Mac iMessage uses `node companion/imessage.mjs --owner YOUR_PHONE_OR_EMAIL` and reads only that named peer.

Run `node scripts/agent-computer-smoke.mjs` explicitly for local Docker verification. Its browser network is a synthetic fixture; it does not sign into external accounts. Actual generated evidence is saved under `artifacts/dots-full-2026-11-15/computer`.
