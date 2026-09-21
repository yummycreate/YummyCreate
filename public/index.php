<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=UTF-8');

$cssVersion = (string) @filemtime(__DIR__ . '/assets/css/style.css');
?>
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>YummyCreate</title>
  <link rel="stylesheet" href="/assets/css/style.css?v=<?= htmlspecialchars($cssVersion, ENT_QUOTES, 'UTF-8') ?>">
</head>
<body>
  <main class="hero">
    <h1>YummyCreate</h1>
    <p>準備中です。</p>
  </main>
</body>
</html>
