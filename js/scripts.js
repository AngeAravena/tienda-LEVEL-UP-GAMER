// Datos iniciales
const defaultProducts = [
	{ id: 0, name: 'PlayStation 5', type: 'consola', price: 549990, image: 'assets/images/ps5.jpg', description: 'Consola next-gen con SSD ultra rápido y control háptico DualSense.' },
	{ id: 1, name: 'Xbox Series X', type: 'consola', price: 529990, image: 'assets/images/Xbox series X.jpg', description: 'Potencia 4K, Quick Resume y catálogo Game Pass.' },
	{ id: 2, name: 'Nintendo Switch OLED', type: 'consola', price: 349990, image: 'assets/images/Switch OLED.webp', description: 'Híbrida con pantalla OLED de 7" para juego portátil y sobremesa.' },
	{ id: 3, name: 'Control DualSense', type: 'accesorio', price: 69990, image: 'assets/images/Control DualSense.webp', description: 'Vibración háptica, gatillos adaptativos y micrófono integrado.' },
	{ id: 4, name: 'Auriculares HyperX Cloud', type: 'accesorio', price: 79990, image: 'assets/images/Hyper X Headset.webp', description: 'Sonido envolvente y almohadillas de espuma viscoelástica para largas sesiones.' },
	{ id: 5, name: 'PC Gamer ASUS ROG', type: 'pc', price: 1299990, image: 'assets/images/Pc gamer Asus ROG.jpg', description: 'RTX, procesador de alto rendimiento y chasis con flujo de aire optimizado.' },
	{ id: 6, name: 'Pack streamer', type: 'accesorio', price: 119990, image: 'assets/images/Hyper X Headset.webp', description: 'Kit rápido con micrófono USB, audífonos y luz ring para streams.' }
];

const defaultUsers = [
	{ id: 1, name: 'Pepito', lastName: '', email: 'pepitoPro@gmail.com', password: 'Pepitogod123', role: 'admin' }
];

const legacyIdMap = {
	'ps5': 0,
	'xsx': 1,
	'switch-oled': 2,
	'dualsense': 3,
	'hyperx-cloud': 4,
	'pc-rog': 5
};

// Utilidades, acronimos para querySelector
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => ctx.querySelectorAll(sel);
const formatPrice = (n) => `$${Number(n || 0).toLocaleString('es-CL')}`;
const splitNameParts = (fullName = '') => {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	return { first: parts[0] || '', last: parts.slice(1).join(' ') || '' };
};

function normalizeUsersLastName(list) {
	let changed = false;
	const normalized = list.map((u) => {
		if (u && !u.lastName) {
			const { last } = splitNameParts(u.name || '');
			changed = true;
			return { ...u, lastName: last };
		}
		return u;
	});
	if (changed) localStorage.setItem('users', JSON.stringify(normalized));
	return normalized;
}

const loadFromStorage = (key, fallback) => {
	try {
		const value = JSON.parse(localStorage.getItem(key) || 'null');
		if (Array.isArray(fallback) && Array.isArray(value)) return value;
		if (!Array.isArray(fallback) && value) return value;
	} catch (err) {
		console.error('Storage parse error', err);
	}
	localStorage.setItem(key, JSON.stringify(fallback));
	return structuredClone(fallback);
};

let products = loadFromStorage('products', defaultProducts);
let users = normalizeUsersLastName(loadFromStorage('users', defaultUsers));

function ensureAdminSeed() {
	const seed = defaultUsers[0];
	const seedEmail = seed.email.toLowerCase();
	let found = false;
	users = users.map((u) => {
		if (u.role === 'admin') {
			found = true;
			return { ...u, ...seed, email: seedEmail, lastName: u.lastName || '' };
		}
		return u;
	});
	if (!found) {
		users.push({ ...seed, email: seedEmail, lastName: '' });
	}
	localStorage.setItem('users', JSON.stringify(users));
}

if (!products.every((p) => Number.isInteger(p.id))) {
	products = structuredClone(defaultProducts);
	localStorage.setItem('products', JSON.stringify(products));
}

ensureAdminSeed();

const getSession = () => {
	const session = loadFromStorage('session', null);
	if (session && !session.lastName) {
		const { last } = splitNameParts(session.name || '');
		const normalized = { ...session, lastName: session.lastName || last };
		setSession(normalized);
		return normalized;
	}
	return session;
};
const setSession = (user) => localStorage.setItem('session', JSON.stringify(user));
const clearSession = () => localStorage.removeItem('session');

const getCart = () => {
	const cart = loadFromStorage('cart', []);
	let changed = false;
	const normalized = cart.map((item) => {
		if (typeof item.id === 'string' && legacyIdMap[item.id] !== undefined) {
			changed = true;
			return { ...item, id: legacyIdMap[item.id] };
		}
		return item;
	});
	if (changed) localStorage.setItem('cart', JSON.stringify(normalized));
	return normalized;
};
const saveCart = (cart) => localStorage.setItem('cart', JSON.stringify(cart));

// Toast
let toastHost;
function showToast(message, duration = 2000) {
	if (!toastHost) {
		toastHost = document.createElement('div');
		toastHost.className = 'toast-host';
		document.body.appendChild(toastHost);
	}
	const el = document.createElement('div');
	el.className = 'toast-notice';
	el.textContent = message;
	toastHost.appendChild(el);
	setTimeout(() => {
		el.classList.add('hide');
		setTimeout(() => el.remove(), 300);
	}, duration);
}

// Navbar dinámico
function renderNavAuth() {
	const session = getSession();
	qsa('[data-auth-section]').forEach((el) => {
		const target = el.dataset.authSection;
		const isGreeting = el.hasAttribute('data-greeting');
		const show = (!session && target === 'guest') ||
			(session && target === 'user' && session.role === 'user') ||
			(session && target === 'admin' && session.role === 'admin') ||
			(session && isGreeting);
		el.classList.toggle('d-none', !show);
		el.style.display = show ? '' : 'none';
	});
	const nameNode = qs('[data-username]');
	const hasName = session && session.name;
	if (nameNode) nameNode.textContent = hasName ? session.name : '';
	qsa('[data-username]').forEach((node) => {
		const li = node.closest('[data-greeting]');
		if (li) {
			const visible = Boolean(hasName);
			li.classList.toggle('d-none', !visible);
			li.style.display = visible ? '' : 'none';

			const link = li.querySelector('.nav-link');
			if (link) {
				const isAdmin = session && session.role === 'admin';
				link.className = isAdmin ? 'btn btn-outline-light btn-sm' : 'nav-link';
				link.onclick = isAdmin ? (() => { window.location.href = 'admin.html'; }) : null;
			}
		}
	});
}

// Productos listado
function renderProducts() {
	const grid = qs('#products-grid');
	if (!grid) return;

	const params = new URLSearchParams(window.location.search);
	const tipo = params.get('tipo');

	const filtered = products.filter((p) => !tipo || p.type === tipo);
	grid.innerHTML = '';

	filtered.forEach((product) => {
		const col = document.createElement('div');
		col.className = 'col-md-4';
		col.dataset.tipo = product.type;
		col.innerHTML = `
			<div class="card h-100 shadow-sm">
				<img class="card-img-top" src="${product.image}" alt="${product.name}">
				<div class="card-body d-flex flex-column">
					<a href="producto-detalle.html?id=${product.id}" class="stretched-link text-decoration-none"><h5 class="card-title">${product.name}</h5></a>
					<p class="text-muted mb-2 text-capitalize">${product.type}</p>
					<p class="price-tag mb-3">${formatPrice(product.price)}</p>
					<button class="btn btn-primary mt-auto" data-add-cart="${product.id}" type="button">Añadir</button>
				</div>
			</div>`;
		grid.appendChild(col);
	});

	qsa('[data-filter-btn]').forEach((btn) => {
		const btnTipo = btn.dataset.filterBtn;
		const active = (!tipo && btnTipo === '') || tipo === btnTipo;
		btn.classList.toggle('btn-primary', active);
		btn.classList.toggle('btn-outline-light', !active);
	});
}

// Carrito
function updateCartCount(count) {
	const counter = qs('#cart-count');
	if (counter) counter.textContent = count;
}

function renderCart() {
	const list = qs('#cart-items');
	const totalNode = qs('#cart-total');

	const cart = getCart();
	updateCartCount(cart.reduce((acc, cur) => acc + cur.qty, 0));
	if (!list || !totalNode) return;
	list.innerHTML = '';

	if (!cart.length) {
		list.innerHTML = '<p class="text-muted mb-0">Tu carrito está vacío.</p>';
		totalNode.textContent = '$0';
		return;
	}

	let total = 0;
	cart.forEach((item) => {
		const product = products.find((p) => p.id === item.id);
		if (!product) return;
		const lineTotal = product.price * item.qty;
		total += lineTotal;
		const row = document.createElement('div');
		row.className = 'd-flex align-items-center justify-content-between mb-2 gap-2';
		row.innerHTML = `
			<div>
				<div class="fw-semibold">${product.name}</div>
				<small class="text-muted">${formatPrice(product.price)} c/u</small>
			</div>
			<div class="d-flex align-items-center gap-2">
				<input type="number" min="1" class="form-control form-control-sm" style="width:72px" value="${item.qty}" data-cart-qty="${product.id}">
				<span class="price-tag">${formatPrice(lineTotal)}</span>
				<button class="btn btn-sm btn-outline-light" data-cart-remove="${product.id}" type="button">✕</button>
			</div>`;
		list.appendChild(row);
	});

	totalNode.textContent = formatPrice(total);
}

function renderPaymentSummary() {
	const container = qs('[data-pay-cart]');
	if (!container) return;
	const list = qs('[data-pay-cart-items]');
	const totalNode = qs('[data-pay-cart-total]');
	const totalRow = qs('[data-pay-cart-total-row]');
	const cart = getCart();
	if (!list || !totalNode) return;

	list.innerHTML = '';
	if (!cart.length) {
		list.innerHTML = '<p class="text-muted mb-0">Tu carrito está vacío.</p>';
		totalNode.textContent = '$0';
		return;
	}

	let total = 0;
	let discount = 0;
	cart.forEach((item) => {
		const product = products.find((p) => p.id === item.id);
		if (!product) return;
		const line = product.price * item.qty;
		total += line;
		const row = document.createElement('div');
		row.className = 'd-flex justify-content-between align-items-center border-bottom border-secondary pb-2';
		row.innerHTML = `
			<div>
				<div class="fw-semibold">${product.name}</div>
				<small class="text-muted">${item.qty} x ${formatPrice(product.price)}</small>
			</div>
			<div class="price-tag">${formatPrice(line)}</div>`;
		list.appendChild(row);
	});

		if (totalRow) {
			const prevDiscountRow = container.querySelector('[data-pay-cart-discount]');
			if (prevDiscountRow) prevDiscountRow.remove();

			const emailInput = qs('[data-pay-email]');
			const email = (emailInput?.value || '').trim().toLowerCase();
			const domain = email.split('@')[1] || '';
			const isDuoc = domain.includes('duocuc.cl');
			if (isDuoc) {
				discount = Math.round(total * 0.2);
				const discountRow = document.createElement('div');
				discountRow.className = 'd-flex justify-content-between align-items-center text-success mt-2';
				discountRow.dataset.payCartDiscount = 'true';
				discountRow.innerHTML = `<span>Descuento exclusivo Duoc</span><span>- ${formatPrice(discount)}</span>`;
				totalRow.parentNode.insertBefore(discountRow, totalRow);
			}
		}

		const finalTotal = Math.max(0, total - discount);
		totalNode.textContent = formatPrice(finalTotal);
}

	function bindContactForm() {
		const form = qs('[data-contact-form]');
		if (!form) return;
		form.addEventListener('submit', (e) => {
			if (!form.checkValidity()) {
				e.preventDefault();
				e.stopPropagation();
				form.classList.add('was-validated');
				return;
			}
			e.preventDefault();
			showToast('Mensaje enviado', 3000);
			form.reset();
			form.classList.remove('was-validated');
		});
	}

function addToCart(id) {
	const cart = getCart();
	const numericId = Number(id);
	const item = cart.find((i) => i.id === numericId);
	if (item) {
		item.qty += 1;
	} else {
		cart.push({ id: numericId, qty: 1 });
	}
	saveCart(cart);
	renderCart();
	showToast('Producto agregado al carrito');
}

function removeFromCart(id) {
	const numericId = Number(id);
	const cart = getCart().filter((i) => i.id !== numericId);
	saveCart(cart);
	renderCart();
}

function setQty(id, qty) {
	const numericId = Number(id);
	const cart = getCart().map((i) => (i.id === numericId ? { ...i, qty } : i));
	saveCart(cart);
	renderCart();
}

// Detalle producto
function renderProductDetail() {
	const detail = qs('[data-product-detail]');
	if (!detail) return;

	const params = new URLSearchParams(window.location.search);
	const id = Number(params.get('id'));
	const product = products.find((p) => p.id === id);

	if (!product) {
		detail.innerHTML = '<p class="text-muted">Producto no encontrado.</p>';
		return;
	}

	qs('[data-detail-title]').textContent = product.name;
	const img = qs('[data-detail-image]');
	if (img) {
		img.setAttribute('src', product.image);
		img.setAttribute('alt', product.name);
	}
	qs('[data-detail-type]').textContent = product.type;
	qs('[data-detail-price]').textContent = formatPrice(product.price);
	qs('[data-detail-desc]').textContent = product.description;

	const addBtn = qs('[data-detail-add]');
	if (addBtn) addBtn.dataset.addCart = product.id;
}

function registerUser(form) {
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const formData = new FormData(form);
		const fullName = formData.get('name').trim();
		const { last } = splitNameParts(fullName);
		const email = formData.get('email').trim().toLowerCase();
		const password = formData.get('password');
		const repeat = formData.get('repeat');

		if (password !== repeat) {
			showToast('Las contraseñas no coinciden');
			return;
		}
		if (users.some((u) => u.email === email)) {
			showToast('Ese correo ya está registrado');
			return;
		}

		const newUser = { id: Date.now(), name: fullName, lastName: last, email, password, role: 'user' };
		users.push(newUser);
		localStorage.setItem('users', JSON.stringify(users));
		setSession({ id: newUser.id, name: newUser.name, lastName: newUser.lastName, email: newUser.email, role: newUser.role });
		showToast('Cuenta creada, bienvenido/a');
		setTimeout(() => window.location.href = 'index.html', 600);
	});
}

function loginUser(form) {
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const formData = new FormData(form);
		const email = formData.get('email').trim().toLowerCase();
		const password = formData.get('password');
		const user = users.find((u) => u.email === email && u.password === password);
		if (!user) {
			showToast('Credenciales inválidas');
			return;
		}
		setSession({ id: user.id, name: user.name, lastName: user.lastName || '', email: user.email, role: user.role });
		showToast('Sesión iniciada');
		setTimeout(() => {
			if (user.role === 'admin') {
				window.location.href = 'admin.html';
			} else {
				window.location.href = 'index.html';
			}
		}, 400);
	});
}

function adminLogin(form) {
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const formData = new FormData(form);
		const email = formData.get('email').trim().toLowerCase();
		const password = formData.get('password');
		const user = users.find((u) => u.email === email && u.password === password && u.role === 'admin');
		if (!user) {
			showToast('Solo admin puede ingresar');
			return;
		}
		setSession({ id: user.id, name: user.name, lastName: user.lastName || '', email: user.email, role: user.role });
		showToast('Bienvenido admin');
		setTimeout(() => window.location.href = 'admin.html', 400);
	});
}

// Admin CRUD
function nextProductId() {
	return products.length ? Math.max(...products.map((p) => Number(p.id))) + 1 : 0;
}

function renderAdminTable() {
	const tbody = qs('[data-admin-products]');
	if (!tbody) return;
	tbody.innerHTML = '';
	products.forEach((p) => {
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${p.id}</td>
			<td>${p.name}</td>
			<td>${formatPrice(p.price)}</td>
			<td class="text-capitalize">${p.type}</td>
			<td>
				<div class="d-flex gap-2">
					<button class="btn btn-sm btn-outline-light" data-edit-id="${p.id}" type="button">Editar</button>
					<button class="btn btn-sm btn-danger" data-delete-id="${p.id}" type="button">Borrar</button>
				</div>
			</td>`;
		tbody.appendChild(row);
	});
}

function nextUserId() {
	return users.length ? Math.max(...users.map((u) => Number(u.id) || 0)) + 1 : 1;
}

function renderUsersTable() {
	const tbody = qs('[data-admin-users]');
	if (!tbody) return;
	tbody.innerHTML = '';
	users.forEach((u) => {
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${u.id}</td>
			<td>${u.name} ${u.lastName || ''}</td>
			<td>${u.email}</td>
			<td class="text-capitalize">${u.role}</td>
			<td>
				<div class="d-flex gap-2">
					<button class="btn btn-sm btn-outline-light" data-edit-user="${u.id}" type="button">Editar</button>
					<button class="btn btn-sm btn-danger" data-delete-user="${u.id}" type="button">Borrar</button>
				</div>
			</td>`;
		tbody.appendChild(row);
	});
}

function fillUserForm(user) {
	const form = qs('[data-admin-user-form]');
	if (!form) return;
	form.dataset.editing = user ? user.id : '';
	form.name.value = user ? user.name : '';
	form.lastName.value = user ? (user.lastName || '') : '';
	form.email.value = user ? user.email : '';
	form.role.value = user ? user.role : 'user';
	form.password.value = '';
}

function bindUserActions() {
	const form = qs('[data-admin-user-form]');
	if (form) {
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			const formData = new FormData(form);
			const payload = {
				name: formData.get('name').trim(),
				lastName: formData.get('lastName').trim(),
				email: formData.get('email').trim().toLowerCase(),
				password: formData.get('password'),
				role: formData.get('role') || 'user'
			};

			if (!payload.name || !payload.lastName || !payload.email) {
				showToast('Nombre, apellido y correo son obligatorios');
				return;
			}

			const editingId = form.dataset.editing;
			const emailTaken = users.some((u) => u.email === payload.email && String(u.id) !== String(editingId || ''));
			if (emailTaken) {
				showToast('Ese correo ya existe');
				return;
			}

			if (editingId) {
				users = users.map((u) => {
					if (String(u.id) !== String(editingId)) return u;
					return {
						...u,
						name: payload.name,
						lastName: payload.lastName,
						email: payload.email,
						role: payload.role,
						password: payload.password ? payload.password : u.password
					};
				});
				showToast('Usuario actualizado');
			} else {
				if (!payload.password) {
					showToast('Ingresa contraseña para crear usuario');
					return;
				}
				const newUser = {
					id: nextUserId(),
					name: payload.name,
					lastName: payload.lastName,
					email: payload.email,
					password: payload.password,
					role: payload.role
				};
				users.push(newUser);
				showToast('Usuario creado');
			}

			localStorage.setItem('users', JSON.stringify(users));
			fillUserForm(null);
			renderUsersTable();
		});
	}

	document.addEventListener('click', (e) => {
		const editBtn = e.target.closest('[data-edit-user]');
		if (editBtn) {
			const user = users.find((u) => String(u.id) === editBtn.dataset.editUser);
			if (user) fillUserForm(user);
		}
		const deleteBtn = e.target.closest('[data-delete-user]');
		if (deleteBtn) {
			const id = deleteBtn.dataset.deleteUser;
			users = users.filter((u) => String(u.id) !== String(id));
			localStorage.setItem('users', JSON.stringify(users));
			renderUsersTable();
			showToast('Usuario eliminado');
		}
	});
}

function fillAdminForm(product) {
	const form = qs('[data-admin-product-form]');
	if (!form) return;
	form.dataset.editing = product ? product.id : '';
	form.name.value = product ? product.name : '';
	form.price.value = product ? product.price : '';
	form.type.value = product ? product.type : 'consola';
	form.image.value = product ? product.image : '';
	form.description.value = product ? product.description : '';
}

function bindAdminActions() {
	const form = qs('[data-admin-product-form]');
	if (form) {
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			const formData = new FormData(form);
			const payload = {
				name: formData.get('name').trim(),
				price: Number(formData.get('price') || 0),
				type: formData.get('type'),
				image: formData.get('image').trim(),
				description: formData.get('description').trim()
			};

			if (!payload.name || !payload.price) {
				showToast('Nombre y precio son obligatorios');
				return;
			}

			const editingId = form.dataset.editing;
			if (editingId) {
				products = products.map((p) => p.id === Number(editingId) ? { ...p, ...payload } : p);
				showToast('Producto actualizado');
			} else {
				products.push({ id: nextProductId(), ...payload });
				showToast('Producto creado');
			}
			localStorage.setItem('products', JSON.stringify(products));
			fillAdminForm(null);
			renderProducts();
			renderAdminTable();
			renderCart();
		});
	}

	document.addEventListener('click', (e) => {
		const editBtn = e.target.closest('[data-edit-id]');
		if (editBtn) {
			const product = products.find((p) => p.id === Number(editBtn.dataset.editId));
			if (product) fillAdminForm(product);
		}
		const deleteBtn = e.target.closest('[data-delete-id]');
		if (deleteBtn) {
			const id = Number(deleteBtn.dataset.deleteId);
			products = products.filter((p) => p.id !== id);
			localStorage.setItem('products', JSON.stringify(products));
			renderProducts();
			renderAdminTable();
			renderCart();
		}
	});
}

function enforceGuards() {
	const pageType = document.body.dataset.page;
	const session = getSession();
	if (pageType === 'admin-only' && (!session || session.role !== 'admin')) {
		window.location.href = 'loginAdmin.html';
	}
}

function bindPayment() {
	const methodButtons = qsa('[data-pay-method]');
	if (!methodButtons.length) return;

	const methodInput = qs('[data-pay-method-input]');
	const cuotasInput = qs('[data-pay-cuotas-input]');
	const cuotasSection = qs('[data-cuotas-section]');
	const cuotaButtons = qsa('[data-pay-cuota]');
	const nameInput = qs('[data-pay-name]');
	const lastInput = qs('[data-pay-last]');
	const emailInput = qs('[data-pay-email]');

	const prefillFromSession = () => {
		const session = getSession();
		if (!session) return;
		const { first, last } = splitNameParts(session.name || '');
		const sessionLast = session.lastName || session.lastname || session.last || session.apellido || session.apellidos || '';
		if (nameInput && !nameInput.value) nameInput.value = first || '';
		if (lastInput && !lastInput.value) lastInput.value = sessionLast || last || '';
		if (emailInput && !emailInput.value) emailInput.value = session.email || '';
		renderPaymentSummary();
	};

	const selectCuota = (value) => {
		if (!cuotasInput) return;
		cuotasInput.value = value;
		cuotaButtons.forEach((btn) => {
			const active = btn.dataset.payCuota === value;
			btn.classList.toggle('btn-primary', active);
			btn.classList.toggle('btn-outline-light', !active);
		});
	};

	const selectMethod = (method) => {
		if (methodInput) methodInput.value = method;
		methodButtons.forEach((btn) => {
			const active = btn.dataset.payMethod === method;
			btn.classList.toggle('btn-primary', active);
			btn.classList.toggle('btn-outline-light', !active);
		});
		if (method === 'credito') {
			if (cuotasSection) cuotasSection.classList.remove('d-none');
			if (cuotaButtons.length && (!cuotasInput || !cuotasInput.value)) {
				selectCuota(cuotaButtons[0].dataset.payCuota);
			}
		} else {
			if (cuotasSection) cuotasSection.classList.add('d-none');
			if (cuotasInput) cuotasInput.value = '';
			cuotaButtons.forEach((btn) => {
				btn.classList.remove('btn-primary');
				btn.classList.add('btn-outline-light');
			});
		}
	};

	methodButtons.forEach((btn) => btn.addEventListener('click', () => selectMethod(btn.dataset.payMethod)));
	cuotaButtons.forEach((btn) => btn.addEventListener('click', () => selectCuota(btn.dataset.payCuota)));
	if (emailInput) emailInput.addEventListener('input', renderPaymentSummary);
	prefillFromSession();

	const confirmBtn = qs('[data-pay-confirm]');
	if (confirmBtn) {
		confirmBtn.addEventListener('click', () => {
			const cart = getCart();
			const name = (nameInput?.value || '').trim();
			const last = (lastInput?.value || '').trim();
			const email = (emailInput?.value || '').trim();
			const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

			if (!cart.length) {
				showToast('Tu carrito está vacío');
				return;
			}
			if (!name || !last) {
				showToast('Completa nombre y apellido');
				return;
			}
			if (!isEmailValid) {
				showToast('Correo inválido');
				return;
			}
			const method = methodInput ? methodInput.value : '';
			if (!method) {
				showToast('Selecciona débito o crédito');
				return;
			}
			if (method === 'credito' && cuotasInput && !cuotasInput.value) {
				showToast('Elige una cantidad de cuotas');
				return;
			}
			saveCart([]);
			renderCart();
			showToast('Pago exitoso, compra finalizada', 5000);
			setTimeout(() => window.location.href = 'index.html', 5200);
		});
	}

	const backBtn = qs('[data-pay-back]');
	if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'productos.html');
}

// Eventos globales
document.addEventListener('click', (e) => {
	const addBtn = e.target.closest('[data-add-cart]');
	if (addBtn) {
		addToCart(addBtn.dataset.addCart);
	}

	const removeBtn = e.target.closest('[data-cart-remove]');
	if (removeBtn) {
		removeFromCart(removeBtn.dataset.cartRemove);
	}

	const logoutBtn = e.target.closest('[data-logout]');
	if (logoutBtn) {
		clearSession();
		renderNavAuth();
		showToast('Sesión cerrada');
		setTimeout(() => window.location.reload(), 300);
	}

	const proceedPayBtn = e.target.closest('[data-proceed-pay]');
	if (proceedPayBtn) {
		const session = getSession();
		if (session) {
			showToast('Usaremos tus datos de sesión en el pago');
		}
		window.location.href = 'pago.html';
	}
});

document.addEventListener('input', (e) => {
	const qtyInput = e.target.closest('[data-cart-qty]');
	if (qtyInput) {
		const id = qtyInput.dataset.cartQty;
		const val = Math.max(1, parseInt(qtyInput.value || '1', 10));
		qtyInput.value = val;
		setQty(id, val);
	}
});

// Init
document.addEventListener('DOMContentLoaded', () => {
	enforceGuards();
	renderNavAuth();
	renderProducts();
	renderCart();
	renderPaymentSummary();
	renderProductDetail();

	const registerForm = qs('[data-register-form]');
	if (registerForm) registerUser(registerForm);

	const loginForm = qs('[data-login-form]');
	if (loginForm) loginUser(loginForm);

	const adminLoginForm = qs('[data-admin-login-form]');
	if (adminLoginForm) adminLogin(adminLoginForm);

	if (document.body.dataset.page === 'admin-only') {
		renderAdminTable();
		bindAdminActions();
		renderUsersTable();
		bindUserActions();
	}

	bindPayment();
	bindContactForm();
});