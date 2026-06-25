# Guia de rodaje y montaje: reel "GENESIS"

Reel vertical 9:16 (~12-15s) en 3 actos: Ruptura -> Genesis -> En tus manos.
Se graban DOS modulos por separado y se unen en edicion.

## Antes de grabar
- Movil reciente. Android Chrome es lo mas fiable; iOS Safari funciona, probar antes.
- Buena luz, fondo neutro y oscuro si se puede (el glow luce mas).
- Imprime la tarjeta `marker/card.png` (A5/A6, mate). Tenla a mano.
- Graba en vertical. Limpia la lente.

## Modulo 1 (Ruptura + Genesis): https://mps136.github.io/ar-flyer-demo/genesis/
1. Abre el enlace, pulsa Comenzar, acepta camara.
2. Encuadra la tarjeta centrada. Cuando aparezca el efecto, manten el pulso firme.
3. La secuencia dura ~7s: ruptura -> nube -> ensamblado -> logo que respira.
4. Toca la pantalla para repetir y graba varias tomas. Quedate con la mejor (idealmente termina con el logo ya formado).

## Modulo 2 (En tus manos): https://mps136.github.io/ar-flyer-demo/manos/
1. Abre el enlace, pulsa Comenzar, acepta camara.
2. Muestra la palma abierta en el encuadre. El hexagono se posa sobre la mano.
3. Juega: abre/cierra la mano, inclinala, acercala a camara.
4. Graba varias tomas. Quedate con la mas estable y expresiva.

## Montaje (CapCut / Premiere / lo que uses)
1. Pon la toma del Modulo 1 primero; corta justo cuando el logo esta formado y "despega".
2. Enlaza con la toma del Modulo 2 usando una transicion de destello/whip-pan/estallido (tapa el salto).
3. Musica: electronica/cinematica con un "drop" en el momento del ensamblado del logo.
4. Sonido: whoosh en la ruptura, shimmer/glitch en la genesis, golpe grave en el cierre.
5. Cierre: tarjeta de marca o el logo a pantalla completa 1-2s.
6. Exporta 1080x1920, 9:16.

## Ajustes si algo no sale
- Modulo 1: si el tracking baila, mas luz y tarjeta plana sin reflejos. Si el bloom satura, se baja en el codigo (makeComposer strength).
- Modulo 2: si el logo no cuadra en la palma, se ajustan en manos/index.html las constantes dist (distancia), baseScale (tamano) y el umbral de apertura openK.
