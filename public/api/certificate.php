<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', 1);

require __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/db.php'; // stellt $pdo bereit

use Dompdf\Dompdf;
use Dompdf\Options;

session_start();

// --- Login-Pflicht -------------------------------------------------------
// Vorher: name/project/id kamen ungeprüft aus der URL -- jeder, der eine
// beliebige tree_id erriet oder kannte, konnte sich ein Zertifikat für
// FREMDE Namen/Projekte generieren. Jetzt: nur der eingeloggte User selbst,
// und nur für einen Baum, der wirklich ihm gehört.
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Bitte zuerst einloggen, um dein Zertifikat herunterzuladen.';
    exit;
}

$treeId = trim((string)($_GET['id'] ?? ''));
if ($treeId === '') {
    http_response_code(400);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Keine Baum-ID angegeben.';
    exit;
}

// tree_id muss existieren UND dem eingeloggten User gehören. So kann niemand
// über eine fremde/erratene tree_id ein Zertifikat mit falschem Namen ziehen --
// Name und Projekt kommen aus der DB, nicht mehr aus der URL.
$stmt = $pdo->prepare(
    'SELECT t.tree_id, t.project_name, u.username
     FROM tree_records t
     JOIN users u ON u.id = t.user_id
     WHERE t.tree_id = ? AND t.user_id = ?'
);
$stmt->execute([$treeId, $_SESSION['user_id']]);
$record = $stmt->fetch();

if (!$record) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Kein Zertifikat gefunden -- entweder existiert diese Baum-ID nicht, oder sie gehört nicht zu deinem Account.';
    exit;
}

$name    = htmlspecialchars($record['username'], ENT_QUOTES, 'UTF-8');
$project = htmlspecialchars($record['project_name'], ENT_QUOTES, 'UTF-8');
$id      = htmlspecialchars($record['tree_id'], ENT_QUOTES, 'UTF-8');

$date = date("d.m.Y");


$options = new Options();
$options->set('isHtml5ParserEnabled', true);
$options->set('isRemoteEnabled', false);
$options->set('defaultFont', 'Helvetica');


$dompdf = new Dompdf($options);


$html = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>

@page {
    size: A4 landscape;
    margin:0;
}


body {
    margin:0;
    padding:0;
    background:#050a07;
    color:#EAF0E4;
    font-family: Helvetica, Arial, sans-serif;
}


.page {
    width:842pt;
    height:595pt;
    position:relative;
    background:#050a07;
}


/* Rahmen */

.border-one {
    position:absolute;
    top:25pt;
    left:25pt;
    right:25pt;
    bottom:25pt;
    border:2pt solid #1C3324;
}


.border-two {
    position:absolute;
    top:35pt;
    left:35pt;
    right:35pt;
    bottom:35pt;
    border:1pt solid #A7C957;
}



/* Header */

.header {
    position:absolute;
    top:65pt;
    left:70pt;
    right:70pt;
}


.logo {
    font-size:22pt;
    font-weight:bold;
}


.logo-green {
    color:#A7C957;
}


.tag {
    font-size:9pt;
    letter-spacing:2pt;
    color:#7FB069;
}



/* Mitte */

.content {
    position:absolute;
    top:160pt;
    left:100pt;
    right:100pt;
    text-align:center;
}


.small {
    color:#E8C547;
    font-size:11pt;
    letter-spacing:3pt;
}


h1 {
    font-size:34pt;
    margin:20pt 0;
    color:#EAF0E4;
}


.text {
    font-size:15pt;
    color:#B8C6B0;
    line-height:1.6;
}


.name {
    color:white;
    font-size:24pt;
    font-weight:bold;
}


.project {
    color:#A7C957;
    font-weight:bold;
}



/* ID */

.id-box {

margin:25pt auto 0 auto;

width:260pt;

border:1pt solid #1C3324;

background:#102018;

padding:12pt;

box-sizing:border-box;

}


.id-title {

    font-size:8pt;
    letter-spacing:2pt;
    color:#7FB069;

}


.id {

    margin-top:8pt;

    color:#E8C547;

    font-size:18pt;

    font-family:monospace;

}

/* STEMPEL STAMP */

.stamp {

position:absolute;

right:75pt;
bottom:55pt;

width:85pt;
height:85pt;

border:3pt solid #A7C957;
border-radius:50%;

background:#050a07;

color:#A7C957;

}


.stamp small {

font-size:7pt;

letter-spacing:1pt;

}



/* Footer */


.footer {

    position:absolute;

    bottom:70pt;

    left:70pt;

    right:70pt;

    font-size:9pt;

    color:#7FB069;

}


.left {
    float:left;
}


.right {
    float:right;
    text-align:right;
}


</style>


</head>


<body>


<div class="page">


<div class="border-one"></div>
<div class="border-two"></div>



<div class="header">

<table width="100%">
<tr>

<td class="logo">
<span class="logo-green">{}</span> code4trees
</td>


<td align="right" class="tag">
CERTIFICATE OF ENVIRONMENTAL IMPACT
</td>

</tr>
</table>


</div>




<div class="content">


<div class="small">
OFFICIAL CERTIFICATE
</div>


<h1>
Sustainable Code Impact
</h1>


<div class="text">

This certificate confirms that

<br><br>

<span class="name">
$name
</span>


<br><br>

successfully submitted the project


<br>


<span class="project">
$project
</span>


<br><br>


Through this contribution, one real tree is funded
for environmental restoration and education.


</div>



<div class="id-box">

<div class="id-title">
VERIFIED TREE IDENTIFIER
</div>

<div style="
margin-top:8pt;
font-size:7pt;
color:#7FB069;
letter-spacing:1pt;
">
CERTIFICATE NO. $id
</div>


</div>


</div>






<div class="footer">

<div class="left">

✓ VERIFIED BY AI<br>
STATUS: ACTIVE / PLANTED

</div>


<div class="right">

CODE4TREES CAMPUS<br>
ISSUED: $date

</div>


</div>

<div class="stamp">

✓ VERIFIED

<br>

<small>
CODE4TREES
</small>

<br>

<small>
AI CHECK
</small>

</div>



</div>




</body>

</html>

HTML;



$dompdf->loadHtml($html);


$dompdf->setPaper('A4','landscape');


$dompdf->render();



$fileId = preg_replace('/[^A-Za-z0-9\-]/','',$id);



$dompdf->stream(
    "code4trees-certificate-$fileId.pdf",
    [
        "Attachment"=>true
    ]
);

exit;

?>