/* KÖMIR · ссылки WhatsApp автора и форма брони. */
(() => {
  const S = window.SITE || {};

  // Все кнопки с data-whats ведут к автору сайта.
  if (S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    const href = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
    document.querySelectorAll("[data-whats]").forEach((a) => (a.href = href));
  }

  // Бронь: проверяем поля.
  const form = document.querySelector(".bron-form");
  if (!form) return;
  const status = form.querySelector(".form-status");
  const data = form.elements.data;
  if (data) data.min = new Date().toISOString().slice(0, 10);

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
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
    status.className = "form-status campo--inteiro ok";
    status.textContent = "Спасибо! Заявка принята, мы свяжемся с вами для подтверждения.";
  });
})();
