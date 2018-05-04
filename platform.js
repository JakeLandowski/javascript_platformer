const simpleLevelPlan = 
[[
    '                        ',
    '                        ',
    '   x              = x   ',
    '   x        o o     x   ',
    '   x @     xxxxx    x   ',
    '   xxxxxx!!!!!!!!!!!x   ',
    '        xxxxxxxxxxxxx   ',
    '                        '
]];

const GAME_LEVELS =[ 
    [                                                 
      '    v                        v                    v                       v     ',
      '                                              v                                 ',
      '          v                                                             v       ',
      '                       v           v                    v                       ',
      '              v                             v                v        v         ',
      '                                                                                ',
      '                  v                      v                        xxx           ',
      '                                                   xx      xx    xx!xx          ',
      '                                    o o      xx                  x!!!x          ',
      '                                                                 xx!xx          ',
      '                                   xxxxx                          xvx           ',
      '                                                                            xx  ',
      '  xx                                      o o                                x  ',
      '  x                     o                                                    x  ',
      '  x                                      xxxxx                             o x  ',
      '  x          xxxx       o                                                    x  ',
      '  x  @       x  x                                                xxxxx       x  ',
      '  xxxxxxxxxxxx  xxxxxxxxxxxxxxx   xxxxxxxxxxxxxxxxxxxx     xxxxxxx   xxxxxxxxx  ',
      '                              x   x                  x     x                    ',
      '                              x!!!x                  x!!!!!x                    ',
      '                              x!!!x                  x!!!!!x                    ',
      '                              xxxxx                  xxxxxxx                    ',
      '                                                                                ',
      '                                                                                '
    ]];

const actorChars = 
{
    '@': Player,
    'o': Coin,
    '=': Lava,
    '|': Lava,
    'v': Lava
};

const speedMap = 
{
    Lava: 
        {
            '=': new Vector(2, 0),
            '|': new Vector(0, 2),
            'v': new Vector(0, 3)
        }
};

const scale = 15;
const maxStep = 0.05;
const playerXSpeed = 12;
const wobbleSpeed = 15;
const wobbleDist  = 1;
const gravity = 30;
const jumpSpeed = 17;

const arrowCodes = 
{
    37: 'left',
    38: 'up',
    39: 'right',
    27: 'esc'
};

let PAUSED = false;
let arrows;
trackKeys(arrowCodes);

  //=====================================================//
 //                  Level Object Code                  //
//=====================================================//

function Level(plan)
{
    this.width  = plan[0].length;
    this.height = plan.length;
    this.grid   = [];
    this.actors = [];

    let line, gridLine, ch, fieldType, Actor;

    for(let y = 0; y < this.height; y++)
    {
        line = plan[y];
        gridLine = [];
        
        for(let x = 0; x < this.width; x++)
        {
            ch = line[x];
            fieldType = null;
            Actor = actorChars[ch];
            
            if(Actor) this.actors.push(new Actor(new Vector(x, y), ch));
            else if(ch == 'x') fieldType = 'wall';
            else if(ch == '!') fieldType = 'lava';
            gridLine.push(fieldType);
        }

        this.grid.push(gridLine);
    }

    this.player = this.actors.filter(function(actor)
    {
        return actor.type == 'player';
    })[0];

    this.status = this.finishDelay = null;
}

Level.prototype.isFinished = function()
{
    return this.status != null && this.finishDelay < 0;
};

Level.prototype.obstacleAt = function(pos, size)
{
    let xStart = Math.floor(pos.x);
    let xEnd   = Math.ceil(pos.x + size.x);
    let yStart = Math.floor(pos.y);
    let yEnd   = Math.ceil(pos.y + size.y);
    
    if(xStart < 0 || xEnd > this.width || yStart < 0)
        return 'wall';
    if(yEnd > this.height) 
        return 'lava';
    
    for(let y = yStart; y < yEnd; y++)
    {
        for(let x = xStart; x < xEnd; x++)
        {
            if(this.grid[y][x]) return this.grid[y][x];
        }
    }
};

Level.prototype.actorAt = function(actor)
{
    let other;
    for(let i = 0; i < this.actors.length; i++)
    {
        other = this.actors[i];

        if(other != actor &&
           actor.pos.x + actor.size.x > other.pos.x  &&
           actor.pos.x < other.pos.x  + other.size.x &&
           actor.pos.y + actor.size.y > other.pos.y  &&
           actor.pos.y < other.pos.y  + other.size.y)
           return other;
    }
};

Level.prototype.animate = function(step, keys)
{
    if(this.status != null) this.finishDelay -= step;

    let thisStep;
    while(step > 0)
    {
        thisStep = Math.min(step, maxStep);
        this.actors.forEach(function(actor)
        {
            actor.act(thisStep, this, keys);
        }, this);

        step -= thisStep;
    
    }
};

Level.prototype.playerTouched = function(type, actor)
{
    if(type == 'lava' && this.status == null)
    {
        this.status = 'lost';
        this.finishDelay = 1;
    }
    else if(type == 'coin')
    {
        this.actors = this.actors.filter(function(other)
        {
            return other != actor;
        });

        let predicate = function(actor)
        {
            return actor.type == 'coin';
        };

        if(!this.actors.some(predicate))
        {
            this.status = 'won';
            this.finishDelay = 1;
        }
    }
};

  //=====================================================//
 //                Vector Object Code                   //
//=====================================================//

function Vector(x, y)
{
    this.x = x;
    this.y = y;   
}

Vector.prototype.plus = function(other)
{
    return new Vector(this.x + other.x, this.y + other.y);
};

Vector.prototype.times = function(factor)
{
    return new Vector(this.x * factor, this.y * factor);
};

  //=====================================================//
 //                 Player Object Code                  //
//=====================================================//

function Player(pos)
{
    this.pos   = pos.plus(new Vector(0, -0.5));
    this.size  = new Vector(0.8, 1.5);
    this.speed = new Vector(0, 0);    
}

Player.prototype.type = 'player';

Player.prototype.moveX = function(step, level, keys)
{
    this.speed.x = 0;
    if(keys.left)
    {
        this.speed.x -= playerXSpeed; 
        this.size.x += 0.01;
    }  
    if(keys.right)
    {
        this.speed.x += playerXSpeed; 
        this.size.x += 0.01;
    } 

    let motion = new Vector(this.speed.x * step, 0);
    let newPos = this.pos.plus(motion);
    let obstacle = level.obstacleAt(newPos, this.size);
    
    if(obstacle)
        level.playerTouched(obstacle);
    else
        this.pos = newPos;
};

Player.prototype.moveY = function(step, level, keys)
{
    this.speed.y += step * gravity;

    let motion   = new Vector(0, this.speed.y * step);
    let newPos   = this.pos.plus(motion);
    let obstacle = level.obstacleAt(newPos, this.size);

    if(obstacle)
    {
        level.playerTouched(obstacle);
        
        if(keys.up && this.speed.y > 0)
            this.speed.y = -jumpSpeed;
        else
            this.speed.y = 0;
    }
    else
    {
        this.pos = newPos;
    }
};

Player.prototype.act = function(step, level, keys)
{
    this.moveX(step, level, keys);
    this.moveY(step, level, keys);

    let otherActor = level.actorAt(this);

    if(otherActor) level.playerTouched(otherActor.type, otherActor);

    // Losing Animation
    if(level.status == 'lost')
    {
        this.pos.y += step;
        this.size.y -= step;
        this.speed.y = -25;
        this.pos.x += 1;
    }
};

  //=====================================================//
 //                 Lava Object Code                    //
//=====================================================//

function Lava(pos, ch)
{
    this.pos   = pos;
    this.size  = new Vector(1, 1);
    this.speed = speedMap.Lava[ch];
    if(ch == 'v') this.repeatPos = pos; 
}

Lava.prototype.type = 'lava';

Lava.prototype.act = function(step, level)
{
    let newPos = this.pos.plus(this.speed.times(step));

    if(!level.obstacleAt(newPos, this.size)) 
         this.pos = newPos;
    else if(this.repeatPos) 
        this.pos = this.repeatPos;
    else
        this.speed = this.speed.times(-1);
};

  //=====================================================//
 //                 Coin Object Code                    //
//=====================================================//

function Coin(pos)
{
    this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
    this.size = new Vector(0.6, 0.6);
    this.wobble = Math.random() * Math.PI * 2;
}

Coin.prototype.type = 'coin';

Coin.prototype.act = function(step)
{
    this.wobble += step * wobbleSpeed;
    let wobblePos = Math.sin(this.wobble) * wobbleDist;
    this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

  //=====================================================//
 //                  Rendering Code                     //
//=====================================================//

function element(name, className)
{
    let element = document.createElement(name);
    if(className) element.className = className;
    return element;
}

function DOMDisplay(parent, level)
{
    this.wrap  = parent.appendChild(element('div', 'game'));
    this.level = level;

    this.wrap.appendChild(this.drawBackground());
    this.actorLater = null;
    this.drawFrame();
}

DOMDisplay.prototype.drawBackground = function()
{
    let table = element('table', 'background');
    table.style.width = this.level.width * scale + 'px';
    this.level.grid.forEach(function(row)
    {
        let rowElement = table.appendChild(element('tr'));
        rowElement.style.height = scale + 'px';
        row.forEach(function(type)
        {
            rowElement.appendChild(element('td', type));
        });
    });

    return table;
};

DOMDisplay.prototype.drawActors = function()
{
    let wrap = element('div');
    
    this.level.actors.forEach(function(actor)
    {
        let rect = wrap.appendChild(element('div', 'actor ' + actor.type));
        rect.style.width  = actor.size.x * scale + 'px';
        rect.style.height = actor.size.y * scale + 'px';
        rect.style.left   = actor.pos.x  * scale + 'px';
        rect.style.top    = actor.pos.y  * scale + 'px';
    });

    return wrap;
};

DOMDisplay.prototype.drawFrame = function()
{
    if(this.actorLayer) this.wrap.removeChild(this.actorLayer);
    
    this.actorLayer = this.wrap.appendChild(this.drawActors());
    this.wrap.className = 'game ' + (this.level.status || '');
    this.scrollPlayerIntoView();
}

DOMDisplay.prototype.scrollPlayerIntoView = function()
{
    let width  = this.wrap.clientWidth;
    let height = this.wrap.clientHeight;
    let margin = width / 3;

    // Viewport
    let left   = this.wrap.scrollLeft;
    let right  = left + width;
    let top    = this.wrap.scrollTop;
    let bottom = top + height;
    let player = this.level.player;  
    let center = player.pos.plus(player.size.times(0.5)).times(scale);
    
         if(center.x < left + margin)  this.wrap.scrollLeft = center.x - margin;
    else if(center.x > right - margin) this.wrap.scrollLeft = center.x + margin - width;
    
         if(center.y < top + margin)    this.wrap.scrollTop = center.y - margin;
    else if(center.y > bottom - margin) this.wrap.scrollTop = center.y + margin - height;
};

DOMDisplay.prototype.clear = function()
{
    this.wrap.parentNode.removeChild(this.wrap);
};

function trackKeys(codes)
{
    let pressed = Object.create(null);

    function handler()
    {
        if(codes.hasOwnProperty(event.keyCode))
        {
            let down = event.type == 'keydown';
            pressed[codes[event.keyCode]] = down;
            event.preventDefault();
        }

    }

    addEventListener('keydown', handler);
    addEventListener('keyup', handler);
    addEventListener('keydown', function(e)
    {
        if(e.keyCode == 27) PAUSED = !PAUSED;
    });

    arrows = pressed;
}

function runAnimation(frameFunc)
{
    let lastTime = null;

    function frame(time)
    {
        let stop = false;
        
        if(lastTime != null)
        {
            let timeStep = Math.min(time - lastTime, 100) / 1000;
            stop = frameFunc(timeStep) === false;
        }

        lastTime = time;

        if(!stop) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

function runLevel(level, Display, andThen)
{
    let display = new Display(document.body, level);

    runAnimation(function(step)
    {
        if(!PAUSED)
        {
            level.animate(step, arrows);
            display.drawFrame(step);
            if(level.isFinished())
            {
                display.clear();
                if(andThen) andThen(level.status);
                return false;
            }
        }
    });
}

function runGame(plans, Display)
{
    let lives = 3;

    function startLevel(n)
    {
        runLevel(new Level(plans[n]), Display, function(status)
        {
            if(lives < 1)
            {
                gameOver();
            }
            else if(status == 'lost')
            {
                startLevel(n);
                lives--;
            }
            else if(n < plans.length - 1)
                startLevel(n + 1);
            else
                console.log('You win!');
        });
    }

    startLevel(0);
}

function gameOver()
{
    document.getElementById('gameover').innerHTML = "<h1>Game Over</h1>";
}

//=====================================================//
//                       Runtime                       //
//=====================================================//

// const simpleLevel = new Level(simpleLevelPlan);
// const display = new DOMDisplay(document.body, simpleLevel);

runGame(GAME_LEVELS, DOMDisplay);