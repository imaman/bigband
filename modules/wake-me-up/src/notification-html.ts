export function generateNotificationHtml(timeString: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #e8d5f5, #d5e5f5, #e8d5f5);
      background-size: 400% 400%;
      animation: gradientShift 4s ease infinite;
      overflow: hidden;
      user-select: none;
      -webkit-app-region: drag;
    }

    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .container {
      text-align: center;
      animation: fadeIn 0.6s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .bell {
      font-size: 48px;
      animation: glow 2s ease-in-out infinite;
    }

    @keyframes glow {
      0%, 100% { filter: drop-shadow(0 0 8px rgba(150, 120, 200, 0.4)); }
      50% { filter: drop-shadow(0 0 20px rgba(150, 120, 200, 0.8)); }
    }

    h1 {
      font-size: 36px;
      font-weight: 300;
      color: #4a3f6b;
      margin: 16px 0 8px;
      letter-spacing: 1px;
    }

    .time {
      font-size: 18px;
      color: #6b5f8a;
      margin-bottom: 32px;
    }

    button {
      -webkit-app-region: no-drag;
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(150, 120, 200, 0.3);
      border-radius: 24px;
      padding: 12px 40px;
      font-size: 16px;
      color: #4a3f6b;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    button:hover {
      background: rgba(255, 255, 255, 0.9);
      border-color: rgba(150, 120, 200, 0.6);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="bell">\u{1F514}</div>
    <h1>Time's up!</h1>
    <p class="time">It is ${timeString}</p>
    <button id="dismiss">Dismiss</button>
  </div>

  <script>
    // Repeating melody that gradually intensifies
    (function() {
      var ctx = new AudioContext();
      var melody = [523.25, 659.25, 783.99, 659.25, 698.46, 783.99, 880.00, 783.99, 698.46, 659.25, 587.33, 523.25]; // C5, E5, G5, E5, F5, G5, A5, G5, F5, E5, D5, C5
      var noteDuration = 0.3;
      var melodyLength = melody.length * noteDuration;
      var repeatInterval = melodyLength + 0.8;
      var maxVolume = 0.4;
      var startVolume = 0.05;
      var rampUpRepeats = 10;
      var dismissed = false;

      function playMelody(repetition) {
        if (dismissed) return;
        var volume = Math.min(startVolume + (maxVolume - startVolume) * (repetition / rampUpRepeats), maxVolume);
        var offset = ctx.currentTime;
        melody.forEach(function(freq, i) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          var noteStart = offset + i * noteDuration;
          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(volume, noteStart + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration - 0.02);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteStart);
          osc.stop(noteStart + noteDuration);
        });
        setTimeout(function() { playMelody(repetition + 1); }, repeatInterval * 1000);
      }

      playMelody(0);
      window.__dismissAudio = function() { dismissed = true; };
    })();

    function dismiss() {
      if (window.__dismissAudio) window.__dismissAudio();
      var electron = require('electron');
      electron.ipcRenderer.send('dismiss');
    }

    document.getElementById('dismiss').addEventListener('click', dismiss);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        dismiss();
      }
    });
  </script>
</body>
</html>`
}
