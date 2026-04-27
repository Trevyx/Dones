import antigravity
import os

# Configuramos la aplicación
app = antigravity.app()

# Esta ruta le dice a la web que muestre tu index.html al entrar
@app.route('/')
def index():
    return antigravity.render('index.html')

# Aquí es donde pondremos la lógica para guardar los datos de organizadores
@app.route('/guardar_organizador', methods=['POST'])
def guardar():
    # Lógica para guardar en la base de datos (lo veremos en el siguiente paso)
    return "Datos guardados con éxito"

if __name__ == "__main__":
    # Importante para Render: usa el puerto que ellos nos den
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
