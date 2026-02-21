export function generateSchedulerHtml(): string {
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

    h1 {
      font-size: 36px;
      font-weight: 300;
      color: #4a3f6b;
      margin-bottom: 24px;
      letter-spacing: 1px;
    }

    input {
      -webkit-app-region: no-drag;
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(150, 120, 200, 0.3);
      border-radius: 12px;
      padding: 12px 20px;
      font-size: 20px;
      color: #4a3f6b;
      text-align: center;
      width: 200px;
      outline: none;
      transition: all 0.2s ease;
    }

    input:focus {
      background: rgba(255, 255, 255, 0.9);
      border-color: rgba(150, 120, 200, 0.6);
    }

    input::placeholder {
      color: #9b8fb8;
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
      margin-top: 20px;
    }

    button:hover {
      background: rgba(255, 255, 255, 0.9);
      border-color: rgba(150, 120, 200, 0.6);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Wake me up in\u2026</h1>
    <input id="duration" type="text" placeholder="e.g. 5m, 30s" autofocus>
    <br>
    <button id="start">Start</button>
  </div>

  <script>
    function submit() {
      var value = document.getElementById('duration').value.trim();
      if (value) {
        var electron = require('electron');
        electron.ipcRenderer.send('schedule', value);
      }
    }

    document.getElementById('start').addEventListener('click', submit);
    document.getElementById('duration').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        submit();
      }
    });
  </script>
</body>
</html>`
}
