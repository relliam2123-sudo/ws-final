// ===== Store data =====
const STORE_NAME = 'Tinapay Corner';

const PRODUCTS = [
  { id: 'pandesal',   name: 'Pandesal (6 pcs)',      price: 36 },
  { id: 'ube-cheese', name: 'Ube cheese pandesal',   price: 18 },
  { id: 'ensaymada',  name: 'Ensaymada',             price: 35 },
  { id: 'spanish',    name: 'Spanish bread',         price: 18 },
  { id: 'pan-coco',   name: 'Pan de coco',           price: 22 },
  { id: 'cheese-roll',name: 'Cheese roll',           price: 25 },
  { id: 'monay',      name: 'Monay',                 price: 15 },
  { id: 'mamon',      name: 'Mamon',                 price: 15 },
  { id: 'hopia',      name: 'Hopia ube',             price: 20 },
  { id: 'crinkles',   name: 'Choco crinkles (3 pcs)',price: 30 },
  { id: 'egg-pie',    name: 'Egg pie slice',         price: 40 },
  { id: 'brazo',      name: 'Brazo de Mercedes slice',price: 55 },
  { id: 'coffee',     name: 'Brewed coffee',         price: 45 },
  { id: 'chocolate',  name: 'Hot chocolate',         price: 55 },
  { id: 'iced-tea',   name: 'Iced tea',              price: 40 },
  { id: 'milk',       name: 'Fresh milk',            price: 35 },
];

const DISCOUNTS = [
  { id: 'none',    label: 'No discount', rate: 0 },
  { id: 'senior',  label: 'Senior / PWD', rate: 0.20 },
  { id: 'student', label: 'Student',      rate: 0.10 },
];

// ===== State: everything on screen is drawn from these four values =====
let cart = [];                 // [{ id, name, price, qty }]
let discount = DISCOUNTS[0];   // the selected discount
let orderNumber = 1;
let sale = null;               // filled when payment is completed

// ===== Helpers =====
const $ = (selector) => document.querySelector(selector);
const money = (n) => n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const round2 = (n) => Math.round(n * 100) / 100;          // avoids 0.1 + 0.2 style errors
const pad = (n) => String(n).padStart(4, '0');
const discountName = (d) => (d.rate ? `${d.label} ${Math.round(d.rate * 100)}%` : d.label);

const payModalEl = $('#payModal');
const payModal = new bootstrap.Modal(payModalEl);
const receiptModal = new bootstrap.Modal($('#receiptModal'));

// ===== 1. Display and search products =====
function renderProducts() {
  const query = $('#search').value.trim().toLowerCase();
  const matches = PRODUCTS.filter((p) => p.name.toLowerCase().includes(query));

  $('#product-grid').innerHTML = matches.map((p) => `
    <div class="col">
      <button type="button" class="product" data-id="${p.id}">
        <span class="product-name">${p.name}</span>
        <span class="product-price">${money(p.price)}</span>
      </button>
    </div>`).join('');

  const none = $('#no-results');
  none.hidden = matches.length > 0;
  none.textContent = `No products match “${$('#search').value.trim()}”.`;
}

// ===== 2 and 3. Add, change quantity, remove =====
function addToCart(id) {
  const item = cart.find((i) => i.id === id);
  if (item) {
    item.qty = Math.min(99, item.qty + 1);
  } else {
    cart.push({ ...PRODUCTS.find((p) => p.id === id), qty: 1 });
  }
  renderCart();
}

function changeQty(id, change) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.min(99, Math.max(1, item.qty + change));
  renderCart();
}

function removeItem(id) {
  cart = cart.filter((i) => i.id !== id);
  renderCart();
}

// ===== 4 and 5. Subtotal, discount, total =====
function getTotals() {
  const subtotal = round2(cart.reduce((sum, i) => sum + i.price * i.qty, 0));
  const discountAmount = round2(subtotal * discount.rate);
  const total = round2(subtotal - discountAmount);
  return { subtotal, discountAmount, total };
}

function renderCart() {
  $('#cart-empty').hidden = cart.length > 0;
  $('#cart-items').innerHTML = cart.map((i) => `
    <li class="cart-item">
      <div class="cart-line"><span>${i.name}</span><span>${money(i.price * i.qty)}</span></div>
      <div class="cart-controls">
        <div class="qty">
          <button type="button" class="btn btn-outline-secondary" data-action="dec" data-id="${i.id}"
                  aria-label="Decrease quantity of ${i.name}" ${i.qty === 1 ? 'disabled' : ''}>−</button>
          <span class="qty-value">${i.qty}</span>
          <button type="button" class="btn btn-outline-secondary" data-action="inc" data-id="${i.id}"
                  aria-label="Increase quantity of ${i.name}">+</button>
        </div>
        <span class="text-secondary small">${money(i.price)} each</span>
        <button type="button" class="btn btn-link btn-sm remove" data-action="remove" data-id="${i.id}"
                aria-label="Remove ${i.name}">Remove</button>
      </div>
    </li>`).join('');

  const { subtotal, discountAmount, total } = getTotals();
  $('#subtotal').textContent = money(subtotal);
  $('#discount-amount').textContent = discountAmount ? '−' + money(discountAmount) : money(0);
  $('#total').textContent = money(total);
  $('#charge-btn').textContent = `Charge ${money(total)}`;
  $('#charge-btn').disabled = cart.length === 0;
  $('#clear-btn').disabled = cart.length === 0;
  $('#order-no').textContent = '#' + pad(orderNumber);
}

// ===== 6. Payment and change =====
function openPayment() {
  if (cart.length === 0) return;
  $('#pay-total').textContent = money(getTotals().total);
  $('#cash').value = '';
  updateChange();
  payModal.show();
}

function updateChange() {
  const { total } = getTotals();
  const cash = parseFloat($('#cash').value);
  const line = $('#change-line');

  if (isNaN(cash)) {
    line.textContent = 'Enter the cash received.';
    line.className = 'change mb-0 mt-3';
  } else if (cash < total) {
    line.textContent = `Short by ${money(round2(total - cash))}`;
    line.className = 'change short mb-0 mt-3';
  } else {
    line.textContent = `Change ${money(round2(cash - total))}`;
    line.className = 'change ok mb-0 mt-3';
  }
  $('#complete-btn').disabled = isNaN(cash) || cash < total;
}

function completeSale() {
  const { subtotal, discountAmount, total } = getTotals();
  const cash = round2(parseFloat($('#cash').value));
  if (isNaN(cash) || cash < total) return;

  // Freeze the sale so the receipt never changes after payment.
  sale = {
    number: orderNumber, date: new Date(),
    items: cart.map((i) => ({ ...i })), discount,
    subtotal, discountAmount, total, cash, change: round2(cash - total),
  };
  renderReceipt(sale);

  // Show the receipt only after the payment window has finished closing.
  payModalEl.addEventListener('hidden.bs.modal', () => receiptModal.show(), { once: true });
  payModal.hide();
}

// ===== 7. Receipt =====
function renderReceipt(s) {
  const lines = s.items.map((i) =>
    `<div class="r-line"><span>${i.qty} × ${i.name}</span><span>${money(i.price * i.qty)}</span></div>`).join('');
  const discountLine = s.discountAmount
    ? `<div class="r-line"><span>Discount (${discountName(s.discount)})</span><span>−${money(s.discountAmount)}</span></div>`
    : '';

  $('#receipt').innerHTML = `
    <p class="r-center r-store">${STORE_NAME}</p>
    <p class="r-center">Receipt #${pad(s.number)}<br>${s.date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
    <hr>${lines}<hr>
    <div class="r-line"><span>Subtotal</span><span>${money(s.subtotal)}</span></div>
    ${discountLine}
    <div class="r-line r-total"><span>Total</span><span>${money(s.total)}</span></div>
    <div class="r-line"><span>Cash</span><span>${money(s.cash)}</span></div>
    <div class="r-line"><span>Change</span><span>${money(s.change)}</span></div>
    <hr><p class="r-center">Thank you! Come again.</p>`;
}

// ===== 8. New transaction =====
function newTransaction() {
  if (sale) { orderNumber += 1; sale = null; }   // number only advances after a real sale
  cart = [];
  discount = DISCOUNTS[0];
  $('#discount').value = discount.id;
  $('#search').value = '';
  receiptModal.hide();
  renderProducts();
  renderCart();
  $('#search').focus();
}

// ===== Wire up the buttons =====
$('#search').addEventListener('input', renderProducts);

$('#product-grid').addEventListener('click', (e) => {
  const tile = e.target.closest('[data-id]');
  if (tile) addToCart(tile.dataset.id);
});

$('#cart-items').addEventListener('click', (e) => {
  const button = e.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'inc') changeQty(id, 1);
  if (action === 'dec') changeQty(id, -1);
  if (action === 'remove') removeItem(id);
});

$('#discount').addEventListener('change', (e) => {
  discount = DISCOUNTS.find((d) => d.id === e.target.value);
  renderCart();
});

$('#clear-btn').addEventListener('click', () => {
  if (confirm('Clear this order?')) newTransaction();
});

$('#charge-btn').addEventListener('click', openPayment);
$('#cash').addEventListener('input', updateChange);
$('#cash').addEventListener('keydown', (e) => { if (e.key === 'Enter') completeSale(); });
$('#exact-btn').addEventListener('click', () => {
  $('#cash').value = getTotals().total.toFixed(2);
  updateChange();
});
$('#complete-btn').addEventListener('click', completeSale);
payModalEl.addEventListener('shown.bs.modal', () => $('#cash').focus());
$('#print-btn').addEventListener('click', () => window.print());
$('#new-btn').addEventListener('click', newTransaction);

// ===== Start =====
$('#discount').innerHTML = DISCOUNTS.map((d) => `<option value="${d.id}">${discountName(d)}</option>`).join('');
renderProducts();
renderCart();
