const url = 'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DjfKfPfyJRdk&format=json'; fetch(url).then(r=>r.json()).then(console.log).catch(console.error);
