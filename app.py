import http.server
import socketserver
import os

# Configuración del puerto para Render
PORT = int(os.environ.get("PORT", 8080))

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Si entran a la raíz, les servimos el index.html
        if self.path == '/':
            self.path = '/templates/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Iniciamos el servidor
with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"Servidor activo en el puerto {PORT}")
    httpd.serve_forever()
