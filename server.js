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
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

/* ============================= */
/* CONEXIÓN MONGODB ATLAS */
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
/* ADMIN */
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

app.get("/admin", async (req, res) => {
  if (!req.session.admin) return res.redirect("/login.html");

  const pedidos = await Pedido.find()
    .populate("usuario")
    .sort({ fecha: -1 });

  let html = `<h1>Panel Admin - Market Electro Express</h1>
              <a href="/logout-admin">Cerrar sesión</a><hr/>`;

  pedidos.forEach(p => {
    html += `
      <div style="border:1px solid #ccc; padding:10px; margin:10px;">
        <strong>Email:</strong> ${p.usuario ? p.usuario.email : "Usuario eliminado"}<br/>
        <strong>Total:</strong> $${p.total}<br/>
        <strong>Estado:</strong> ${p.estado}<br/>
        <strong>Fecha:</strong> ${p.fecha}
      </div>
    `;
  });

  res.send(html);
});

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

  const nuevoUser = new User({
    email,
    password: hash
  });

  await nuevoUser.save();

  res.redirect("/login.html");
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