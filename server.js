require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();

/* ============================= */
/* CONFIGURACIÓN */
/* ============================= */

const PORT = process.env.PORT || 3000;

/* ============================= */
/* MIDDLEWARES */
/* ============================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// STATIC PARA PRODUCCIÓN (Render)
const publicPath = path.join(__dirname, "paginaweb", "public");
app.use(express.static(publicPath));

// Ruta raíz
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

/* ============================= */
/* CONEXIÓN MONGODB */
/* ============================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log("❌ Error conexión MongoDB:", err));

/* ============================= */
/* MODELOS */
/* ============================= */

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
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
/* PANEL ADMIN MEJORADO */
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
      body { font-family: Arial; background:#f4f4f4; padding:20px; }
      .card { background:white; padding:15px; margin:15px 0; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);}
      button { padding:6px 12px; border:none; border-radius:4px; cursor:pointer; margin-right:5px;}
      .aprobar { background:green; color:white; }
      .rechazar { background:red; color:white; }
      .logout { display:inline-block; margin-bottom:20px; }
      h2 { margin-top:40px; }
    </style>
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
    html += `
      <div class="card">
        <strong>Email:</strong> ${p.usuario ? p.usuario.email : "Usuario eliminado"}<br/>
        <strong>Total:</strong> $${p.total}<br/>
        <strong>Estado:</strong> ${p.estado}<br/>
        <strong>Fecha:</strong> ${p.fecha}<br/><br/>

        <form method="POST" action="/admin/cambiar-estado/${p._id}">
          <button class="aprobar" name="estado" value="aprobado">Aprobar</button>
          <button class="rechazar" name="estado" value="rechazado">Rechazar</button>
        </form>
      </div>
    `;
  });

  html += `<h2>Usuarios Registrados</h2>`;

  if (usuarios.length === 0) {
    html += `<p>No hay usuarios registrados todavía.</p>`;
  }

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
/* CAMBIAR ESTADO PEDIDO */
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
/* REGISTRO USUARIO */
/* ============================= */

app.post("/registro", async (req, res) => {
  const { email, password } = req.body;

  const existe = await User.findOne({ email });
  if (existe) return res.send("Usuario ya existe");

  const hash = bcrypt.hashSync(password, 10);

  const nuevoUser = new User({
    email,
    password: hash
  });

  await nuevoUser.save();
  res.redirect("/registro-exitoso.html");
});

/* ============================= */
/* LOGIN USUARIO */
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
/* LOGOUT USUARIO */
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

  const nuevoPedido = new Pedido({
    usuario: req.session.userId,
    productos,
    total
  });

  await nuevoPedido.save();
  res.json({ ok: true });
});

/* ============================= */
/* HISTORIAL USUARIO */
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