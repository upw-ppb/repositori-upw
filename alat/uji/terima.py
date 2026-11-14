import http.server, base64, json, os, sys
D = sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers["Content-Length"]); j = json.loads(self.rfile.read(n))
        for f in j: open(os.path.join(D, f["nama"].replace("/", "_")), "wb").write(base64.b64decode(f["b64"]))
        self.send_response(200); self.send_header("Access-Control-Allow-Origin", "*"); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", 8799), H).handle_request()
