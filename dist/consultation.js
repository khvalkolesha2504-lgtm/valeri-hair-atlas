export const tourSteps = [
  {
    mode: "whole",
    layer: "cuticle",
    title: "Один волос — несколько уровней защиты",
    text: "Сначала рассмотрим поверхность. Видимая длина — сформированный стержень волоса. Наружная оболочка защищает то, что находится внутри.",
    isolate: false,
  },
  {
    mode: "cut",
    layer: "cuticle",
    title: "Кутикула: чешуйки, которые перекрывают друг друга",
    text: "Клетки кутикулы перекрывают друг друга, как черепица. Эта оболочка защищает кортекс и влияет на трение, блеск и обмен влагой. При износе поверхность становится шероховатой. Сейчас остальные детали приглушены.",
    isolate: true,
  },
  {
    mode: "cut",
    layer: "cortex",
    title: "Кортекс: основная масса волоса",
    text: "Кортекс — основная масса волоса. Кератиновые волокна обеспечивают прочность и упругость; тёмные гранулы обозначают пигмент меланин. При повреждении каркаса волос легче обламывается. Детали модели увеличены.",
    isolate: true,
  },
  {
    mode: "cross",
    layer: "medulla",
    title: "Сечение: от оболочки к центру",
    text: "В поперечном разрезе видно расположение слоёв. Медулла находится в центре, но встречается не во всех волосах. Её отсутствие само по себе не означает повреждение.",
    isolate: false,
  },
  {
    mode: "cut",
    layer: "cuticle",
    title: "Как это связано с уходом?",
    text: "Косметический уход помогает управляемости и внешнему виду длины. Он не выращивает утраченные клетки заново. Ниже можно узнать о процедурах и домашнем уходе.",
    isolate: false,
  },
];
export function initConsultation({ selectLayer, setMode, getViewer }) {
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let tourIndex = 0,
    tourActive = false,
    playing = false,
    timer = null;
  const schedule = () => {
    clearTimeout(timer);
    if (playing)
      timer = setTimeout(() => {
        if (tourIndex === tourSteps.length - 1) {
          playing = false;
          $("#tour-play").textContent = "Повторить";
          $("#tour-play").setAttribute("aria-pressed", "false");
          $("#tour-next").disabled = true;
        } else showStep(tourIndex + 1);
      }, 20000);
  };
  function setIsolated(value) {
    $("#isolate-toggle").setAttribute("aria-pressed", String(value));
    $("#isolate-toggle").textContent = value ? "Показать все слои" : "Изолировать слой";
    getViewer()?.setIsolated(value);
  }
  function pause() {
    playing = false;
    clearTimeout(timer);
    $("#tour-play").textContent = "Продолжить";
    $("#tour-play").setAttribute("aria-pressed", "false");
  }
  function showStep(index) {
    tourIndex = Math.max(0, Math.min(tourSteps.length - 1, index));
    const t = tourSteps[tourIndex];
    $("#tour-count").textContent = String(tourIndex + 1).padStart(2, "0");
    $("#tour-title").textContent = t.title;
    $("#tour-text").textContent = t.text;
    $("#tour-prev").disabled = tourIndex === 0;
    $("#tour-next").disabled = tourIndex === tourSteps.length - 1;
    $$("[data-tour-step]").forEach((b, i) => {
      b.classList.toggle("active", i === tourIndex);
      b.setAttribute("aria-pressed", String(i === tourIndex));
    });
    setMode(t.mode);
    selectLayer(t.layer);
    setIsolated(t.isolate);
    if (t.mode === "cut" && t.isolate) getViewer()?.focusLayer(t.layer);
    schedule();
  }
  $("#tour-progress").innerHTML = tourSteps
    .map(
      (t, i) =>
        `<button type="button" data-tour-step="${i}" aria-label="Шаг ${i + 1}: ${t.title}" aria-pressed="false"></button>`,
    )
    .join("");
  $("#tour-start").onclick = () => {
    tourActive = true;
    playing = !reduced;
    $("#guided-tour").hidden = false;
    $("#tour-play").textContent = playing ? "Пауза" : "Продолжить";
    $("#tour-play").setAttribute("aria-pressed", String(playing));
    showStep(0);
    $("#model").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  };
  $("#tour-play").onclick = () => {
    if (playing) {
      pause();
      return;
    }
    playing = true;
    $("#tour-play").textContent = "Пауза";
    $("#tour-play").setAttribute("aria-pressed", "true");
    if (tourIndex === tourSteps.length - 1) showStep(0);
    else schedule();
  };
  $("#tour-prev").onclick = () => {
    pause();
    showStep(tourIndex - 1);
  };
  $("#tour-next").onclick = () => {
    pause();
    showStep(tourIndex + 1);
  };
  $$("[data-tour-step]").forEach(
    (b) =>
      (b.onclick = () => {
        pause();
        showStep(Number(b.dataset.tourStep));
      }),
  );
  $("#tour-close").onclick = () => {
    pause();
    tourActive = false;
    $("#guided-tour").hidden = true;
    setIsolated(false);
    setMode("cut");
    $("#tour-start").focus();
  };
  $("#model").addEventListener("pointerdown", () => {
    if (tourActive && playing) pause();
  });
  $("#model").addEventListener("keydown", () => {
    if (tourActive && playing) pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) pause();
  });
  $("#isolate-toggle").onclick = () => {
    setIsolated($("#isolate-toggle").getAttribute("aria-pressed") !== "true");
  };
  $("#labels-toggle").onclick = () => {
    const on = $("#labels-toggle").getAttribute("aria-pressed") !== "true";
    $("#labels-toggle").setAttribute("aria-pressed", String(on));
    const v = getViewer();
    if (v) {
      v.labelsVisible = on;
      v.dirty = true;
    }
  };
  $("#reset").addEventListener("click", () => setIsolated(false));
}
