setInterval(async() => {
    const startDate = Date.now();
    const request = await fetch("http://localhost:3000");
    const endDate = Date.now();
    const json = await request.json() as any;

    console.log(json.message + " Response Time: " + (endDate - startDate).toString() + "ms");
}, 500)