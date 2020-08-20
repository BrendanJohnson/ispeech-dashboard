<template>
  <div class="canvas-wrapper">
    <canvas ref="canvas"></canvas>
    <slot></slot>
  </div>
</template>

<script>

function edges(ctx,p1,p2,cutoff){
console.log(p1.x)
        if (!cutoff) cutoff = 220; // alpha threshold
        var dx = Math.abs(p2.x - p1.x), dy = Math.abs(p2.y - p1.y),
        sx = p2.x > p1.x ? 1 : -1,  sy = p2.y > p1.y ? 1 : -1;
        var x0 = Math.min(p1.x,p2.x), y0=Math.min(p1.y,p2.y);
        var pixels = ctx.getImageData(x0,y0,dx+1,dy+1).data;
        var hits=[], i=0;
        for (x=p1.x,y=p1.y,e=dx-dy; x!=p2.x||y!=p2.y;){
            var red = pixels[((y-y0)*(dx+1)+x-x0)*4];
            var green = pixels[((y-y0)*(dx+1)+x-x0)*4 + 1];
            var blue = pixels[((y-y0)*(dx+1)+x-x0)*4 + 2];
            console.log("r:"+red+"g:"+green+"b:"+blue);
            if (red === 0 && green === 0 && blue === 0){
                console.log(i);
                i++
                hits.push({x:x,y:y});
            }
            var e2 = 2*e;
            if (e2 > -dy){ e-=dy; x+=sx }
            if (e2 <  dx){ e+=dx; y+=sy  }
            //over = alpha>=cutoff;
        }
        return hits;
}

 function arrow(ctx,p1,p2,size) {
        ctx.save();
        var points = edges(ctx,p1,p2);
        console.log(points)
        if (points.length < 2) 
        return p1 = points[0], p2=points[points.length-1];

        // Rotate the context to point along the path
        var dx = p2.x-p1.x, dy=p2.y-p1.y, len=Math.sqrt(dx*dx+dy*dy);
        ctx.translate(p2.x,p2.y);
        ctx.rotate(Math.atan2(dy,dx));

        // line
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(-len+2,0);
        ctx.closePath();
        ctx.stroke();

        // arrowhead
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(-size,-size);
        ctx.lineTo(-size, size);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
}


export default {
  data() {
    return {
      // By creating the provider in the data property, it becomes reactive,
      // so child components will update when `context` changes.
      provider: {
        // This is the CanvasRenderingContext that children will draw to.
        context: null
      }
    }
  },

  // Allows any child component to `inject: ['provider']` and have access to it.
  provide () {
    return {
      provider: this.provider
    }
  },

  mounted () {

    // We can't access the rendering context until the canvas is mounted to the DOM.
    // Once we have it, provide it to all child components.
    this.provider.context = this.$refs['canvas'].getContext('2d')
    console.log('MOUNTED CANVAS')
    this.provider.context.beginPath();
    this.provider.context.moveTo(20, 20);
    this.provider.context.bezierCurveTo(20, 100, 200, 100, 200, 20);
    this.provider.context.stroke();



     
    //arrow(this.provider.context,{x: 75, y: 75},{x: 320, y: 300},10)
   
    // Resize the canvas to fit its parent's width.
    // Normally you'd use a more flexible resize system.
    this.$refs['canvas'].width = this.$refs['canvas'].parentElement.clientWidth
    this.$refs['canvas'].height = this.$refs['canvas'].parentElement.clientHeight
  }
}
</script>