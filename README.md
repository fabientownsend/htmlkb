_This is a pet project, I don't recommand to use it_

# HTML KB

This script has for goal to help to compress and inject css, js and svg into
an html file and get it all in one html file which result to limit the number
of http transaction.

## How to use

With the two following file:

``` html
<!doctype html>
<html lang="en">
  <head>
    <style>
      <!-- css/style.css -->
    </style>
  </head>
  <body>
  </body>
</html>
```

``` css
body {
  background: #000000;
}
```

Run this command
``` bash
node htmlkb.js index.html
```

Which result to have:
``` html
<!doctype html><html lang="en"><head><style>body{background:#000}</style></head><body></body></html>
```
