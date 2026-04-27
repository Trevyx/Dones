from antigravity import WebApp
import os

# Inicializamos la aplicación de Antigravity
app = WebApp(__name__)

# Ruta para mostrar tu index.html
@app.route('/')
def index():
    return app.render('index.html')

if __name__ == "__main__":
    # Usamos el puerto que nos da Render
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
