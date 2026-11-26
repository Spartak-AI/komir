/*! © 2026 SPARTAK LAB. Все права защищены. */
/* KÖMIR · онлайн-заказ: корзина (кнопки «+ В заказ»), плашка внизу экрана,
   оформление (доставка / самовывоз) и отправка готового текста заказа в WhatsApp.
   Корзина хранится в браузере посетителя (localStorage), чтобы не пропадала при обновлении. */
(() => {
  const S = window.SITE || {};
  const CHAVE = "komir-cesta";
  const fmt = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₸";

  let cesta = [];
  try { cesta = JSON.parse(localStorage.getItem(CHAVE) || "[]"); } catch (e) { cesta = []; }
  if (!Array.isArray(cesta)) cesta = [];
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(cesta)); } catch (e) {} };

  const lista = document.querySelector(".cesta-itens");
  const vazia = document.querySelector(".cesta-vazia");
  const total = document.querySelector(".cesta-total");
  const barra = document.querySelector(".carrinho");

  const soma = () => cesta.reduce((t, i) => t + i.preco * i.qtd, 0);
  const qtdTotal = () => cesta.reduce((t, i) => t + i.qtd, 0);
  const palavra = (n) => (n % 10 === 1 && n % 100 !== 11 ? "позиция"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "позиции" : "позиций");

  function render() {
    const n = qtdTotal();
    if (lista) {
      lista.innerHTML = "";
      cesta.forEach((i, k) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="ci-nome"></span>
          <span class="ci-qtd"><button type="button" data-menos="${k}" aria-label="Меньше">−</button><b>${i.qtd}</b><button type="button" data-mais="${k}" aria-label="Больше">+</button></span>
          <span class="ci-preco">${fmt(i.preco * i.qtd)}</span>`;
        li.querySelector(".ci-nome").textContent = i.nome;
        lista.appendChild(li);
      });
    }
    if (vazia) vazia.hidden = n > 0;
    if (total) { total.hidden = n === 0; total.querySelector("b").textContent = fmt(soma()); }
    if (barra) {
      barra.hidden = n === 0;
      barra.querySelector(".carrinho-n").innerHTML = `<span class="cn-pre">В заказе </span>${n} ${palavra(n)}`;
      barra.querySelector(".carrinho-soma").textContent = fmt(soma());
    }
    document.body.classList.toggle("tem-cesta", n > 0);
  }

  function adicionar(nome, preco, botao) {
    const i = cesta.find((x) => x.nome === nome);
    if (i) i.qtd += 1; else cesta.push({ nome, preco, qtd: 1 });
    salvar(); render();
    if (botao) { // короткое подтверждение прямо на кнопке
      const txt = botao.textContent;
      botao.textContent = "✓ Добавлено"; botao.classList.add("ok");
      setTimeout(() => { botao.textContent = txt; botao.classList.remove("ok"); }, 900);
    }
    if (barra) { barra.classList.remove("pulso"); void barra.offsetWidth; barra.classList.add("pulso"); }
  }

  document.addEventListener("click", (ev) => {
    const add = ev.target.closest("[data-add]");
    if (add) { adicionar(add.dataset.add, Number(add.dataset.preco) || 0, add); return; }
    const mais = ev.target.closest("[data-mais]");
    const menos = ev.target.closest("[data-menos]");
    if (mais) { cesta[+mais.dataset.mais].qtd += 1; salvar(); render(); }
    if (menos) {
      const k = +menos.dataset.menos;
      cesta[k].qtd -= 1;
      if (cesta[k].qtd <= 0) cesta.splice(k, 1);
      salvar(); render();
    }
  });

  // доставка / самовывоз: адрес нужен только для доставки
  const form = document.querySelector(".pedido-form");
  if (form) {
    const campoEnd = form.querySelector(".campo-endereco");
    const inputEnd = form.elements.endereco;
    const status = form.querySelector(".form-status");
    const syncModo = () => {
      const entrega = form.elements.modo.value === "Доставка";
      campoEnd.hidden = !entrega;
      inputEnd.required = entrega;
    };
    form.addEventListener("change", (ev) => { if (ev.target.name === "modo") syncModo(); });
    syncModo();

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (!cesta.length) {
        status.className = "form-status campo--inteiro falha";
        status.textContent = "Добавьте в заказ хотя бы одно блюдо из меню.";
        return;
      }
      let ok = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const valido = c.name === "tel" ? c.value.replace(/\D/g, "").length >= 10 : c.value.trim().length > 0;
        c.closest(".campo").classList.toggle("erro", !valido);
        c.setAttribute("aria-invalid", String(!valido));
        if (!valido) ok = false;
      });
      if (!ok) {
        status.className = "form-status campo--inteiro falha";
        status.textContent = "Проверьте выделенные поля.";
        return;
      }
      const d = Object.fromEntries(new FormData(form));
      const linhas = [
        `Здравствуйте! Заказ с сайта ${S.nome || "KÖMIR"}:`,
        ...cesta.map((i) => `- ${i.nome} × ${i.qtd} = ${fmt(i.preco * i.qtd)}`),
        `Итого: ${fmt(soma())}`,
        "",
        `${d.modo}${d.modo === "Доставка" ? `: ${d.endereco}` : ""}`,
        `Когда: ${d.hora}`,
        `Имя: ${d.nome}, тел.: ${d.tel}`,
      ];
      if (d.comentario) linhas.push(`Комментарий: ${d.comentario}`);
      const num = String((S.pedido && S.pedido.whatsapp) || (S.whatsapp && S.whatsapp.numero) || "").replace(/\D/g, "");
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(linhas.join("\n"))}`, "_blank", "noopener");
      status.className = "form-status campo--inteiro ok";
      status.textContent = "Открыли WhatsApp с готовым текстом заказа - отправьте сообщение, и мы подтвердим заказ.";
    });
  }

  // в самом разделе заказа плашка не нужна - не перекрываем форму
  const secao = document.getElementById("zakaz");
  if (secao && barra) new IntersectionObserver(([e]) => barra.classList.toggle("oculto", e.isIntersecting), { rootMargin: "0px 0px -30% 0px" }).observe(secao);
  render();
})();
