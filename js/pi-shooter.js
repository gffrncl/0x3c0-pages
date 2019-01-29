var PiShooter = (function(my) {

    var engine = {
        canvas : null,
        context : null,
        updateInterval : 40, // 25 updates per second
        previousTs : 0,
        lag : 0,
        animationId : null,
        gameOver : null
    };

    var game = {
        hp : 255,
        initialHp : 255,
        points : 0,
        delay : 0,
        growth : 0.5,
        maxSize : 100,
        maxCount : 10,
        gameOver : false,

        // functions
        resetDelay : function() {
            var initialDelay = 25;
            var delayCliff = 5;
            game.delay = Math.max(0, (initialDelay - Math.floor(game.points / delayCliff)));

            var initialMaxCount = 10;
            var countCliff = 10;
            game.maxCount = Math.min(50, initialMaxCount + Math.floor(game.points / countCliff));

            var initialGrowth = 0.5;
            var growthCliff = 25;
            game.growth = Math.min(2, initialGrowth + Math.floor(game.points / growthCliff) * 0.1)
        }
    };

    var objects = [];

    my.create = function() {
        if (typeof window.requestAnimationFrame !== "function") {
            console.log("requestAnimationFrame not available");
            return;
        }

        engine.canvas = document.createElement("canvas");
        engine.canvas.setAttribute("id", "pi-shooter");
        document.body.appendChild(engine.canvas);
        engine.canvas.width = engine.canvas.offsetWidth;
        engine.canvas.height = engine.canvas.offsetHeight;
        engine.context = engine.canvas.getContext("2d");

        engine.canvas.addEventListener("click", function(event) {
            event.preventDefault();
            this.hitscan(event.x, event.y);
        }.bind(this));
        
        engine.canvas.addEventListener("touchstart", function(event) {
            event.preventDefault();
            if (event.touches.length) {
                this.hitscan(event.touches[0].pageX, event.touches[0].pageY);
            }
        }.bind(this));

        window.addEventListener("resize", function() {
            engine.canvas.width = engine.canvas.offsetWidth;
            engine.canvas.height = engine.canvas.offsetHeight;
        });

        engine.gameOver = document.createElement("div");
        engine.gameOver.innerHTML = "game over";
        engine.gameOver.setAttribute("id", "pi-shooter-game-over");
        engine.gameOver.style.display = "none";
        document.body.appendChild(engine.gameOver);

        // start the game
        this.start();
    }

    my.update = function(ts) {
        var dt = ts - engine.previousTs;
        engine.previousTs = ts;
        engine.lag += dt;

        while (engine.lag >= engine.updateInterval) {
            for(var i = 0, ic = objects.length; i < ic; i++) {
                if (objects[i]) {
                    objects[i].update(engine.updateInterval, ts);
                }
            }

            // check whether we need new objects
            if (game.delay <= 0) {
                if (!game.gameOver && objects.length < game.maxCount) {
                    // spawn a new circle, if not game over
                    this.spawn();
                    game.resetDelay();
                }
            }else{
                game.delay--;
            }

            // reduce lag
            engine.lag -= engine.updateInterval;
        }

        // render complete scene
        // pass time-position between two update calls 
        this.render(engine.lag / engine.updateInterval);
        
        this.animate();
    }

    my.render = function(fStep) {
        // redraw the background
        engine.context.fillStyle = "rgb(" + game.hp + "," + game.hp + "," + game.hp + ")";
        engine.context.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
        
        // redraw the objects
        for(var i = 0; i < objects.length; i++) {
            objects[i].draw(engine.context, fStep);
        }

        // draw points
        var points = "" + game.points;
        while(points.length < 5) {
            points = "0" + points;
        }
        engine.context.fillStyle = "#000000";
        if (game.hp < 128) {
            engine.context.fillStyle = "#FFFFFF";
        }
        engine.context.font = "2em 'Open Sans'";
        engine.context.fillText(points, 25, 50);
    }

    my.animate = function() {
        engine.animationId = window.requestAnimationFrame(this.update.bind(this));
    };

    my.start = function() {
        game.hp = game.initialHp;
        game.points = 0;
        game.gameOver = false;
        game.resetDelay();
        engine.gameOver.style.display = "none";
        objects = [];
        this.animate();
    }

    ////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////

    my.spawn = function() {
        var r = (function() {
            return {
                position : {
                    x : 0,
                    y : 0
                },

                size : 0,
                growth : 0,
                maxSize : 0,
                onExplode : null,

                // when hit, fade out
                isFading : false,
                opacity : 1,
                fadeSpeed : 0.1,
                onFade : null,

                update : function(interval, ts) {
                    if (!this.isFading) {
                        this.size += this.growth;
                        if (this.size >= this.maxSize) {
                            // explode!
                            this.onExplode(this);
                        }
                    }else{
                        if (this.opacity <= 0) {
                            this.onFade(this);
                        }else{
                            this.opacity -= this.fadeSpeed;
                            this.size += Math.max(0, (1 - this.opacity) * this.maxSize);
                        }
                    }
                },

                draw : function(ctx, fStep) {
                    ctx.fillStyle = this.color();
                    ctx.beginPath();
                    ctx.arc(this.position.x, this.position.y, this.size, 0, 2 * Math.PI);
                    ctx.fill();
                },

                color : function() {
                    if (!this.isFading) {
                        var g = Math.floor(255 * (1 - (this.size / this.maxSize)));
                        return "rgb(255," + g + ",0)";
                    }else{
                        return "rgba(255, 255, 255, " + this.opacity + ")";
                    }
                },

                onHit : function() {
                    this.isFading = true;
                }
            }
        })();

        r.growth = game.growth;
        r.maxSize = game.maxSize;
        r.onExplode = this.explode.bind(this);
        r.onFade = this.faded.bind(this);
        r.position = {
            x : Math.floor(Math.random() * engine.canvas.width),
            y : Math.floor(Math.random() * engine.canvas.height),
        }

        objects.push(r);
    }

    my.explode = function(circle) {
        if (objects.indexOf(circle) > -1) {
            objects.splice(objects.indexOf(circle), 1);
        }
        game.hp--;
        if (game.hp <= 0) {
            // game over
            this.gameOver();
        }
    }

    my.gameOver = function() {
        game.gameOver = true;
        engine.gameOver.style.display = "block";
    }

    my.faded = function(circle) {
        if (objects.indexOf(circle) > -1) {
            objects.splice(objects.indexOf(circle), 1);
        }
    }

    my.hitscan = function(x, y) {
        if (game.gameOver) {
            if (objects.length) {
                // wait till all circles did explode
                return;
            }else{
                // start a new game
                this.start();
            }
        }
        for (var i = 0, ic = objects.length; i < ic; i++) {
            if (!objects[i] || objects[i].isFading) {
                continue;
            }

            var dX = Math.abs(x - objects[i].position.x);
            var dY = Math.abs(y - objects[i].position.y);
            if (dX <= objects[i].size && dY <= objects[i].size) {
                objects[i].onHit();
                game.points++;
            }
        }
    }
    ////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////

    return my;
})(PiShooter || {})

window.addEventListener("load", function() {
    PiShooter.create();
})