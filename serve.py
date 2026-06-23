#!/usr/bin/env python3
"""Tiny static dev server for the demo.

Serves the web/ directory with correct MIME types for ES modules and JSON, and
disables caching so edits show up immediately.

    python3 serve.py            # http://127.0.0.1:8000
    python3 serve.py --port 9000
"""
import argparse
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".html": "text/html",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


def make_server(directory: str, port: int) -> ThreadingHTTPServer:
    """Build a threading static-file server for `directory` on `port`.

    Shared by the CLI below and the pytest `server_url` fixture in conftest.py.
    """
    handler = partial(Handler, directory=directory)
    return ThreadingHTTPServer(("127.0.0.1", port), handler)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--directory", default=WEB_DIR)
    args = parser.parse_args()

    server = make_server(args.directory, args.port)
    print(f"Serving {args.directory} at http://127.0.0.1:{args.port}  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
