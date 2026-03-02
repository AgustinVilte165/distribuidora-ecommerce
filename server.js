require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================= */
/* MIDDLEWARES */
/* ============================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, "paginaweb", "public");
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

/* ============================= */
/* MONGODB */
/* ============================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log("❌ Error conexión MongoDB:", err));

/* ============================= */
/* MODELOS */
/* ============================= */

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  fechaRegistro: { type: Date, default: Date.now }
});

const PedidoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  productos: Array,
  total: Number,
  estado: { type: String, default: "pendiente" },
  fecha: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Pedido = mongoose.model("Pedido", PedidoSchema);

/* ============================= */
/* ADMIN LOGIN */
/* ============================= */

const adminUser = {
  username: "Agustin",
  password: bcrypt.hashSync("rubio123", 10)
};

app.post("/login-admin", (req, res) => {
  const { username, password } = req.body;

  if (
    username === adminUser.username &&
    bcrypt.compareSync(password, adminUser.password)
  ) {
    req.session.admin = true;
    return res.redirect("/admin");
  }

  res.send("Credenciales incorrectas");
});

/* ============================= */
/* PANEL ADMIN PROFESIONAL */
/* ============================= */

app.get("/admin", async (req, res) => {
  if (!req.session.admin) return res.redirect("/login-admin.html");

  const pedidos = await Pedido.find()
    .populate("usuario")
    .sort({ fecha: -1 });

  const usuarios = await User.find().sort({ fechaRegistro: -1 });

  let html = `
  <html>
  <head>
    <title>Panel Admin - Market Electro Express</title>
    <style>
      body { font-family: Arial; background:#f4f6f9; padding:30px; }
      h1 { margin-bottom:10px; }
      h2 { margin-top:40px; }
      .card {
        background:white;
        padding:20px;
        margin:20px 0;
        border-radius:10px;
        box-shadow:0 3px 8px rgba(0,0,0,0.1);
      }
      button {
        padding:8px 15px;
        border:none;
        border-radius:6px;
        cursor:pointer;
        font-weight:bold;
        margin-right:10px;
      }
      .aprobar { background:#28a745; color:white; }
      .rechazar { background:#dc3545; color:white; }
      .logout {
        display:inline-block;
        margin-bottom:20px;
        text-decoration:none;
        color:white;
        background:#333;
        padding:8px 15px;
        border-radius:6px;
      }
      .estado {
        padding:6px 12px;
        border-radius:20px;
        color:white;
        font-weight:bold;
        font-size:14px;
      }
      .pendiente { background:orange; }
      .hecho { background:green; }
      .rechazado { background:red; }
    </style>

    <script>
      function confirmarCambio() {
        return confirm("¿Estás seguro de cambiar el estado del pedido?");
      }
    </script>

  </head>
  <body>

  <h1>Panel Admin - Market Electro Express</h1>
  <a class="logout" href="/logout-admin">Cerrar sesión</a>

  <h2>Pedidos</h2>
  `;

  if (pedidos.length === 0) {
    html += `<p>No hay pedidos todavía.</p>`;
  }

  pedidos.forEach(p => {

    let claseEstado = "pendiente";
    if (p.estado === "pedido hecho") claseEstado = "hecho";
    if (p.estado.includes("rechazado")) claseEstado = "rechazado";

    html += `
      <div class="card">
        <strong>Email:</strong> ${p.usuario ? p.usuario.email : "Usuario eliminado"}<br/>
        <strong>Total:</strong> $${p.total}<br/>
        <strong>Estado:</strong> 
        <span class="estado ${claseEstado}">
          ${p.estado}
        </span>
        <br/>
        <strong>Fecha:</strong> ${p.fecha}
        <br/><br/>

        <form method="POST" action="/admin/cambiar-estado/${p._id}" onsubmit="return confirmarCambio()">
          <button class="aprobar" name="estado" value="pedido hecho">
            Pedido hecho
          </button>
          <button class="rechazar" name="estado" value="pedido rechazado - hablar con cliente">
            Hablarle al cliente
          </button>
        </form>
      </div>
    `;
  });

  html += `<h2>Usuarios Registrados</h2>`;

  usuarios.forEach(u => {
    html += `
      <div class="card">
        <strong>Email:</strong> ${u.email}<br/>
        <strong>Registrado:</strong> ${u.fechaRegistro}
      </div>
    `;
  });

  html += `
  </body>
  </html>
  `;

  res.send(html);
});

/* ============================= */
/* CAMBIAR ESTADO */
/* ============================= */

app.post("/admin/cambiar-estado/:id", async (req, res) => {
  if (!req.session.admin) {
    return res.status(403).send("No autorizado");
  }

  const { estado } = req.body;
  await Pedido.findByIdAndUpdate(req.params.id, { estado });

  res.redirect("/admin");
});

/* ============================= */
/* LOGOUT ADMIN */
/* ============================= */

app.get("/logout-admin", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

/* ============================= */
/* REGISTRO */
/* ============================= */

app.post("/registro", async (req, res) => {
  const { email, password } = req.body;

  const existe = await User.findOne({ email });
  if (existe) return res.send("Usuario ya existe");

  const hash = bcrypt.hashSync(password, 10);
  await new User({ email, password: hash }).save();

  res.redirect("/registro-exitoso.html");
});

/* ============================= */
/* LOGIN */
/* ============================= */

app.post("/login-user", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.send("Usuario no encontrado");

  const valido = bcrypt.compareSync(password, user.password);
  if (!valido) return res.send("Contraseña incorrecta");

  req.session.userId = user._id;
  req.session.userEmail = user.email;

  res.redirect("/");
});

/* ============================= */
/* RECUPERAR PASSWORD */
/* ============================= */

app.post("/recuperar-password", async (req, res) => {
  const { email, nuevaPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.send("Usuario no encontrado");

  user.password = bcrypt.hashSync(nuevaPassword, 10);
  await user.save();

  res.send(`
    <h2>Contraseña actualizada correctamente ✅</h2>
    <a href="/login.html">Volver al login</a>
  `);
});

/* ============================= */
/* USUARIO ACTUAL */
/* ============================= */

app.get("/usuario-actual", (req, res) => {
  if (!req.session.userId) {
    return res.json({ logueado: false });
  }

  res.json({
    logueado: true,
    email: req.session.userEmail
  });
});

/* ============================= */
/* LOGOUT USER */
/* ============================= */

app.get("/logout-user", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

/* ============================= */
/* CREAR PEDIDO */
/* ============================= */

app.post("/pedido", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Debe iniciar sesión" });
  }

  const { productos, total } = req.body;

  await new Pedido({
    usuario: req.session.userId,
    productos,
    total
  }).save();

  res.json({ ok: true });
});

/* ============================= */
/* HISTORIAL */
/* ============================= */

app.get("/mis-pedidos", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const pedidos = await Pedido.find({ usuario: req.session.userId });
  res.json(pedidos);
});

/* ============================= */
/* INICIAR SERVIDOR */
/* ============================= */

app.listen(PORT, () =>
  console.log("🚀 Servidor corriendo en puerto " + PORT)
);