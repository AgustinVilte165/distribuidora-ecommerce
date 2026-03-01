const productos = [
  { nombre: "Joystick Compatible PS5", precio: 120000, imagen: "img/ps5.jpg", categoria: "Gaming" },
  { nombre: "Joystick Compatible PS4", precio: 35000, imagen: "img/ps4.jpg", categoria: "Gaming" },
  { nombre: "Joystick Compatible PS3", precio: 18000, imagen: "img/ps3.jpg", categoria: "Gaming" },

  { nombre: "Smartwatch D20", precio: 10000, imagen: "img/relojsmartwatch.jpg", categoria: "Tecnología" },
  { nombre: "Auricular I12", precio: 10000, imagen: "img/i12.jpg", categoria: "Tecnología" },
  { nombre: "TV Box ONN 4K", precio: 58000, imagen: "img/tvbox.jpg", categoria: "Tecnología" },
  { nombre: "Cámara Inteligente Oryx", precio: 32000, imagen: "img/camara.jpg", categoria: "Tecnología" },

  { nombre: "Microondas Oryx 20L", precio: 160000, imagen: "img/microondas.jpg", categoria: "Hogar" },
  { nombre: "Sandwichera 3 en 1 Oryx", precio: 50000, imagen: "img/sandwichera.jpg", categoria: "Hogar" },
  { nombre: "Pava Eléctrica Oryx", precio: 22000, imagen: "img/pava.jpg", categoria: "Hogar" },
  { nombre: "Tostadora Oryx", precio: 25000, imagen: "img/tostadora.jpg", categoria: "Hogar" },
  { nombre: "Termo Acero Inox 1.2L", precio: 22000, imagen: "img/termo.jpg", categoria: "Hogar" },
  { nombre: "Secador de Pelo", precio: 25000, imagen: "img/secador.jpg", categoria: "Hogar" },
  { nombre: "Afeitadora", precio: 42000, imagen: "img/afeitadora.jpg", categoria: "Hogar" },
  { nombre: "Depiladora Láser", precio: 60000, imagen: "img/depiladora.jpg", categoria: "Hogar" },

  { nombre: "Parrilla Portátil", precio: 110000, imagen: "img/parrilla.jpg", categoria: "Outdoor" },
  { nombre: "Hamaca Paraguaya", precio: 27000, imagen: "img/hamaca.jpg", categoria: "Outdoor" }
];

let carrito = [];

/* ============================= */
/* RENDER PRODUCTOS POR CATEGORÍA */
/* ============================= */

function renderProductos() {
  const contenedor = document.getElementById("contenedor-productos");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  const categorias = [...new Set(productos.map(p => p.categoria))];

  categorias.forEach(cat => {
    const seccion = document.createElement("div");
    seccion.className = "categoria";
    seccion.innerHTML = `<h2>${cat}</h2><div class="productos-grid" id="grid-${cat}"></div>`;
    contenedor.appendChild(seccion);

    const grid = document.getElementById(`grid-${cat}`);

    productos
      .filter(p => p.categoria === cat)
      .forEach(producto => {
        const index = productos.indexOf(producto);

        grid.innerHTML += `
          <div class="card">
            <img src="${producto.imagen}" alt="${producto.nombre}">
            <h3>${producto.nombre}</h3>
            <p>$${producto.precio.toLocaleString()}</p>
            <button onclick="agregarAlCarrito(${index})">Agregar</button>
          </div>
        `;
      });
  });
}

/* ============================= */
/* CARRITO */
/* ============================= */

function agregarAlCarrito(index) {
  carrito.push(productos[index]);
  actualizarCarrito();
}

function actualizarCarrito() {
  const items = document.getElementById("items");
  const contador = document.getElementById("contador");
  const totalSpan = document.getElementById("total");

  if (!items) return;

  items.innerHTML = "";
  let total = 0;

  carrito.forEach(p => {
    total += p.precio;
    items.innerHTML += `<p>${p.nombre} - $${p.precio.toLocaleString()}</p>`;
  });

  if (contador) contador.innerText = carrito.length;
  if (totalSpan) totalSpan.innerText = total.toLocaleString();
}

function abrirCarrito() {
  document.getElementById("carrito").classList.add("activo");
}

function cerrarCarrito() {
  document.getElementById("carrito").classList.remove("activo");
}

/* ============================= */
/* FINALIZAR COMPRA CON LOGIN */
/* ============================= */

async function finalizarCompra() {
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  const total = carrito.reduce((sum, p) => sum + p.precio, 0);

  const response = await fetch("/pedido", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productos: carrito,
      total
    })
  });

  if (response.status === 401) {
    alert("Debés iniciar sesión para comprar");
    window.location.href = "/login.html";
    return;
  }

  window.location.href =
    "https://wa.me/5491132368577?text=" +
    encodeURIComponent("Hola, hice un pedido por $" + total.toLocaleString());

  carrito = [];
  actualizarCarrito();
  cerrarCarrito();
}

/* ============================= */
/* VERIFICAR USUARIO LOGUEADO */
/* ============================= */

async function verificarUsuario() {
  try {
    const res = await fetch("/usuario-actual");
    const data = await res.json();

    if (data.logueado) {
      const btnLogin = document.getElementById("btn-login");
      const btnRegistro = document.getElementById("btn-registro");
      const saludo = document.getElementById("saludo");
      const btnLogout = document.getElementById("btn-logout");
      const btnHistorial = document.getElementById("btn-historial");

      if (btnLogin) btnLogin.style.display = "none";
      if (btnRegistro) btnRegistro.style.display = "none";

      if (saludo) {
        saludo.style.display = "inline";
        saludo.innerText = "Hola, " + data.email;
      }

      if (btnLogout) btnLogout.style.display = "inline";
      if (btnHistorial) btnHistorial.style.display = "inline";
    }
  } catch (error) {
    console.log("No se pudo verificar usuario");
  }
}

/* ============================= */
/* INICIALIZACIÓN */
/* ============================= */

renderProductos();
verificarUsuario();