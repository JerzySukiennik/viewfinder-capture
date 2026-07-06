# devserver.py — static server with caching disabled (ES modules always fresh in dev)
import http.server, functools, sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8917
directory = sys.argv[2] if len(sys.argv) > 2 else '.'
handler = functools.partial(NoCacheHandler, directory=directory)
http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
