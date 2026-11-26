/*! © 2026 SPARTAK LAB. Все права защищены. */
/* site-workflow · цепочка: одно видео под несколькими секциями.
   Подключить ПОСЛЕ config.js и app.js шаблона: <script src="cadeia.js"></script>
   Нужны: window.SITE.cadeia = { total, desktop, mobile } и разметка из cadeia.html. */
(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 760px)").matches;

  /* ── Цепочка: одно видео под несколькими главами ──────────────────────────
     Пока глава стоит в центре экрана, держим её кадр покоя (data-p),
     между главами проигрываем переход. Кадры грузим, когда секция близко. */
  const cadeia = document.querySelector(".cadeia");
  const cCanvas = cadeia && cadeia.querySelector(".cadeia-canvas");
  if (cadeia && cCanvas && S.cadeia && S.cadeia.total) {
    const ctx = cCanvas.getContext("2d");
    const total = S.cadeia.total;
    const padrao = celular ? S.cadeia.mobile : S.cadeia.desktop;
    const src = (i) => padrao.replace("{n}", String(i + 1).padStart(4, "0"));
    const quadros = new Array(total);
    const caps = [...cadeia.querySelectorAll(".capitulo")];
    const repouso = caps.map((c) => Math.round(parseFloat(c.dataset.p || 0) * (total - 1)));
    const fundo = (getComputedStyle(document.documentElement).getPropertyValue("--fundo").trim() || "#0e0a07");
    const rgb = fundo.length === 7 ? [1, 3, 5].map((k) => parseInt(fundo.slice(k, k + 2), 16)) : [14, 10, 7];
    const cor = (a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    let atual = 0, desenhado = -1, pontos = [], rodando = false, iniciado = false;
    const camadas = cadeia.querySelector(".camadas");
    let sincronizar = () => {};
    const mini = Object.assign(document.createElement("canvas"), { width: 12, height: 7 }); // для размытого фона
    const pano = document.createElement("canvas"); // кадр с растворёнными краями

    const carregar = (i) => {
      if (quadros[i]) return quadros[i];
      const img = new Image();
      img.decoding = "async";
      img.src = src(i);
      img.onload = () => { if (Math.round(atual) === i || desenhado === -1) desenhar(i, true); };
      return (quadros[i] = img);
    };
    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => {
      for (let d = 0; d < total; d++) {
        if (pronto(i - d)) return i - d;
        if (pronto(i + d)) return i + d;
      }
      return -1;
    };

    // Компьютер: «cover» со сдвигом вправо — слева панель с текстом.
    // Телефон: видна центральная полоса кадра (62% ширины) в верхней части экрана.
    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar)) return;
      const img = quadros[j];
      const cw = cCanvas.width, ch = cCanvas.height;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      let x, y, w, h;
      if (celular) {
        // Телефон: сцена высотой ровно под центральную полосу 62% ширины кадра.
        const e = Math.max(cw / iw, ch / ih);
        w = iw * e; h = ih * e; x = (cw - w) / 2; y = (ch - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      } else {
        // Компьютер: кадр всегда на всю высоту сцены (на очень широких экранах обрезается
        // максимум ~5% сверху и снизу, предмет не режется). Если и так не хватает ширины —
        // поля только по бокам, во всю высоту: крайний столбец крошечной копии кадра.
        const eCover = Math.max(cw / iw, ch / ih);
        const e = Math.min(eCover, (ch / ih) * 1.1);
        w = iw * e; h = ih * e;
        x = cw * 0.56 - w / 2;
        x = w <= cw ? Math.min(Math.max(x, 0), cw - w) : Math.min(0, Math.max(cw - w, x));
        y = (ch - h) / 2;
        if (w < cw - 1) {
          const mc = mini.getContext("2d");
          mc.drawImage(img, 0, 0, mini.width, mini.height);
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
          const MW = mini.width, MH = mini.height;
          const fy0 = (-y / h) * MH, fyH = (ch / h) * MH; // видимая по высоте часть кадра в координатах копии
          ctx.drawImage(mini, 0, fy0, 1, fyH, 0, 0, x + w * 0.2, ch);                     // слева
          ctx.drawImage(mini, MW - 1, fy0, 1, fyH, x + w * 0.8, 0, cw - x - w * 0.8, ch); // справа
          // сам кадр с мягко растворёнными боковыми краями
          if (pano.width !== Math.round(w) || pano.height !== Math.round(h)) { pano.width = Math.round(w); pano.height = Math.round(h); }
          const p = pano.getContext("2d");
          p.globalCompositeOperation = "source-over";
          p.clearRect(0, 0, pano.width, pano.height);
          p.drawImage(img, 0, 0, pano.width, pano.height);
          p.globalCompositeOperation = "destination-in";
          const fx = pano.width * 0.14;
          const gx = p.createLinearGradient(0, 0, pano.width, 0);
          gx.addColorStop(0, "rgba(0,0,0,0)"); gx.addColorStop(fx / pano.width, "#000");
          gx.addColorStop(1 - fx / pano.width, "#000"); gx.addColorStop(1, "rgba(0,0,0,0)");
          p.fillStyle = gx; p.fillRect(0, 0, pano.width, pano.height);
          ctx.drawImage(pano, x, y);
        } else {
          ctx.drawImage(img, x, y, w, h);
        }
      }
      desenhado = j;
      // подписи слоёв: где лежит кадр на экране (CSS px) и видны ли они сейчас
      if (camadas) {
        const r = cCanvas.clientWidth / cw;
        camadas.style.setProperty("--qx", x * r + "px");
        camadas.style.setProperty("--qy", y * r + "px");
        camadas.style.setProperty("--qw", w * r + "px");
        camadas.style.setProperty("--qh", h * r + "px");
        const alvoCam = repouso[+camadas.dataset.cap || 1];
        camadas.classList.toggle("ativo", Math.abs(j - alvoCam) <= 2);
      }
    }

    const ajustar = () => {
      const topo = document.querySelector(".topo");
      if (topo) document.documentElement.style.setProperty("--topo-h", topo.offsetHeight + "px");
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cCanvas.width = Math.round(cCanvas.clientWidth * dpr);
      cCanvas.height = Math.round(cCanvas.clientHeight * dpr);
      // опорные точки: [позиция прокрутки, кадр]; вокруг центра главы кадр стоит
      pontos = [];
      caps.forEach((c, k) => {
        if (celular) {
          // телефон: кадр стоит, пока панель главы в зоне чтения (нижняя половина экрана):
          // от «верх панели на 85% высоты» до «низ панели ушёл под картинку (55%)»
          const p = (c.querySelector(".painel, .chegada") || c).getBoundingClientRect();
          pontos.push([scrollY + p.top - innerHeight * 0.85, repouso[k]],
                      [scrollY + p.bottom - innerHeight * 0.55, repouso[k]]);
        } else {
          const r = c.getBoundingClientRect();
          const centro = scrollY + r.top + r.height / 2 - innerHeight / 2;
          const segura = innerHeight * 0.12; // короткий стоп: бургер почти всё время в движении, как в референсе
          pontos.push([centro - segura / 2, repouso[k]], [centro + segura / 2, repouso[k]]);
        }
      });
      desenhado = -1;
      desenhar(Math.round(atual), true);
    };

    const alvoAgora = () => {
      const y = scrollY;
      if (!pontos.length || y <= pontos[0][0]) return pontos.length ? pontos[0][1] : 0;
      for (let k = 1; k < pontos.length; k++) {
        const [y0, f0] = pontos[k - 1], [y1, f1] = pontos[k];
        if (y <= y1) return y1 === y0 ? f1 : f0 + (f1 - f0) * (y - y0) / (y1 - y0);
      }
      return pontos[pontos.length - 1][1];
    };
    // без анимаций — только кадр покоя ближайшей главы, без прокрутки ролика
    const repousoMaisPerto = () => {
      const a = alvoAgora();
      return repouso.reduce((m, f) => (Math.abs(f - a) < Math.abs(m - a) ? f : m), repouso[0]);
    };

    const quadro = () => {
      if (!rodando) return;
      const alvo = alvoAgora();
      atual += (alvo - atual) * 0.18;
      if (Math.abs(alvo - atual) < 0.05) atual = alvo;
      desenhar(Math.round(atual));
      sincronizar(atual);
      requestAnimationFrame(quadro);
    };

    const iniciar = () => {
      if (iniciado) return;
      iniciado = true;
      repouso.forEach(carregar); // сначала кадры покоя
      if (!reduzir) {
        const fila = [];
        for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
        // не больше 6 запросов одновременно: иначе 240 кадров забивают канал и фото меню ниже грузятся последними
        let k = 0, emVoo = 0;
        const lote = () => {
          while (emVoo < 6 && k < fila.length) {
            const i = fila[k++];
            if (pronto(i)) continue;
            const img = carregar(i);
            emVoo++;
            const fim = () => { emVoo--; lote(); };
            img.addEventListener("load", fim, { once: true });
            img.addEventListener("error", fim, { once: true });
          }
        };
        // тяжёлую загрузку кадров запускаем, когда браузер свободен — не мешаем первому касанию
        const quando = window.requestIdleCallback || ((f) => setTimeout(f, 700));
        quando(() => lote(), { timeout: 1500 });
      }
      ajustar();
      atual = reduzir ? repousoMaisPerto() : alvoAgora();
    };

    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) iniciar();
      const perto = e.isIntersecting;
      if (perto && !rodando && !reduzir) { rodando = true; requestAnimationFrame(quadro); }
      if (!perto) rodando = false;
    }, { rootMargin: "150% 0px" }).observe(cadeia);

    if (reduzir) addEventListener("scroll", () => { if (iniciado) { const f = repousoMaisPerto(); desenhar(f); sincronizar(f); } }, { passive: true });

    /* Текст глав синхронно с роликом (как в референсе): копия текста каждой главы лежит
       в слое поверх сцены. Заголовок въезжает справа в конце перехода к своему кадру покоя,
       стоит, пока стоит сцена, и уезжает влево в начале следующего перехода. */
    const camadaTexto = cadeia.querySelector(".cadeia-textos");
    const blocos = [];
    if (camadaTexto) {
      caps.forEach((c, k) => {
        const grade = c.querySelector(".capitulo-grade");
        if (!grade) return;
        const tx = document.createElement("div");
        tx.className = "tx tx-" + (c.id || (k === 0 ? "abertura" : "cap" + k));
        tx.appendChild(grade.cloneNode(true));
        camadaTexto.appendChild(tx);
        const alvoAnim = tx.querySelector(".chegada") || tx.querySelector(".painel");
        blocos.push({ tx, el: alvoAnim, k });
      });
      cadeia.classList.add("sincro");
    }
    const suave = (t) => t * t * (3 - 2 * t);
    const lim = (v) => Math.min(1, Math.max(0, v));
    sincronizar = (f) => {
      for (const b of blocos) {
        const r = repouso[b.k];
        const antes = b.k > 0 ? r - repouso[b.k - 1] : 0;
        const depois = b.k < repouso.length - 1 ? repouso[b.k + 1] - r : 0;
        // въезд: последние 20% перехода к кадру покоя (вместе со сменой фона); выезд: 62–80% следующего перехода, сразу перед въездом нового
        // компьютер: текст поверх сцены — въезд вместе со сменой фона (последние 10%), выезд сразу после начала перехода;
        // телефон: текст под видео — держим почти весь переход, чтобы под видео не было пусто
        const entra = antes ? lim((f - (r - antes * (celular ? 0.2 : 0.1))) / (antes * (celular ? 0.18 : 0.09))) : 1;
        const sai = depois ? lim((f - (r + depois * (celular ? 0.62 : 0.06))) / (depois * (celular ? 0.18 : 0.16))) : 0;
        const e = reduzir ? 0 : 1 - suave(entra);
        const sx = reduzir ? 0 : suave(sai);
        const visivel = entra > 0 && sai < 1;
        b.tx.classList.toggle("visto", visivel);
        if (!visivel || !b.el) continue;
        b.el.style.setProperty("--e", e.toFixed(3));
        b.el.style.setProperty("--sai", sx.toFixed(3));
        b.el.style.opacity = (Math.min(1 - e * 0.6, 1 - sx)).toFixed(3);
      }
    };
    sincronizar(0);
    addEventListener("resize", () => { if (iniciado) ajustar(); });
    addEventListener("load", () => { if (iniciado) ajustar(); }); // шрифты/картинки меняют высоту глав
  }

})();
