// Voxel character definitions - each is {name, voxels: [{x,y,z,color}], scaleHint}
// Coordinates are integer grid, origin centered, y is up
// We'll generate solid voxel art programmatically

function color(hex) { return hex }

const PALETTE = {
  gold: '#FACC15',
  goldDark: '#EAB308',
  dark: '#111827',
  white: '#F8FAFC',
  black: '#0f0f0f',
  red: '#EF4444',
  blue: '#3B82F6',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
  green: '#22C55E',
  orange: '#F97316',
}

// helpers to generate shapes
function fillRect(voxels, {x0,x1,y0,y1,z0,z1,c}) {
  for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) for(let z=z0;z<=z1;z++) voxels.push({x,y,z,color:c})
}
function add(voxels,x,y,z,c){ voxels.push({x,y,z,color:c}) }

export const CHARACTERS = [
  {
    id: 'robot',
    name: 'Neo Robot',
    emoji: '🤖',
    desc: 'Classic biped with antenna',
    voxels: (()=>{ const v=[]; 
      // head 3x3x3
      fillRect(v,{x0:-1,x1:1,y0:6,y1:8,z0:-1,z1:1,c:PALETTE.white});
      add(v,0,9,0,PALETTE.red); // antenna
      add(v,0,10,0,PALETTE.red);
      // eyes
      add(v,-1,7,2,PALETTE.cyan); add(v,1,7,2,PALETTE.cyan);
      // body 3x4x2
      fillRect(v,{x0:-1,x1:1,y0:2,y1:5,z0:-1,z1:0,c:PALETTE.blue});
      add(v,0,4,1,PALETTE.red); // chest
      add(v,0,3,1,PALETTE.gold);
      // arms
      fillRect(v,{x0:-3,x1:-2,y0:2,y1:5,z0:-1,z1:0,c:PALETTE.white});
      fillRect(v,{x0:2,x1:3,y0:2,y1:5,z0:-1,z1:0,c:PALETTE.white});
      // hands
      add(v,-3,1,0,PALETTE.gold); add(v,3,1,0,PALETTE.gold);
      // legs
      fillRect(v,{x0:-1,x1:0,y0:-2,y1:1,z0:-1,z1:0,c:PALETTE.dark});
      fillRect(v,{x0:1,x1:2,y0:-2,y1:1,z0:-1,z1:0,c:PALETTE.dark});
      add(v,-1,-3,0,PALETTE.gold); add(v,0,-3,0,PALETTE.gold); add(v,1,-3,0,PALETTE.gold); add(v,2,-3,0,PALETTE.gold);
      return v;
    })()
  },
  {
    id: 'dragon',
    name: 'Voxel Dragon',
    emoji: '🐉',
    desc: 'Tiny wings & tail',
    voxels: (()=>{ const v=[];
      // body
      fillRect(v,{x0:-1,x1:1,y0:1,y1:3,z0:-2,z1:1,c:PALETTE.green});
      // head
      fillRect(v,{x0:-1,x1:1,y0:3,y1:5,z0:2,z1:3,c:PALETTE.green});
      add(v,0,6,3,PALETTE.orange); // horn
      add(v,-1,4,4,PALETTE.white); add(v,1,4,4,PALETTE.white); // nostrils
      add(v,-1,5,4,PALETTE.red); add(v,1,5,4,PALETTE.red); // eyes
      // wings
      fillRect(v,{x0:-3,x1:-2,y0:2,y1:3,z0:-1,z1:0,c:PALETTE.purple});
      fillRect(v,{x0:2,x1:3,y0:2,y1:3,z0:-1,z1:0,c:PALETTE.purple});
      // tail
      add(v,0,2,-3,PALETTE.green); add(v,0,2,-4,PALETTE.green); add(v,0,3,-5,PALETTE.orange);
      // legs
      add(v,-1,0,0,PALETTE.dark); add(v,1,0,0,PALETTE.dark); add(v,-1,0,1,PALETTE.dark); add(v,1,0,1,PALETTE.dark);
      // belly
      add(v,0,2,0,PALETTE.white); add(v,0,1,0,PALETTE.white);
      return v;
    })()
  },
  {
    id: 'astronaut',
    name: 'Star Walker',
    emoji: '👨‍🚀',
    desc: 'Chibi astronaut',
    voxels: (()=>{ const v=[];
      // helmet
      fillRect(v,{x0:-1,x1:1,y0:6,y1:8,z0:-1,z1:1,c:PALETTE.white});
      add(v,0,7,2,'#7DD3FC'); // visor
      add(v,1,7,2,'#7DD3FC');
      add(v,-1,7,2,'#7DD3FC');
      add(v,0,7,1,'#7DD3FC');
      // body
      fillRect(v,{x0:-1,x1:1,y0:3,y1:5,z0:-1,z1:0,c:PALETTE.white});
      // backpack
      fillRect(v,{x0:-1,x1:1,y0:3,y1:5,z0:-2,z1:-2,c:PALETTE.dark});
      add(v,0,5,0,PALETTE.blue); add(v,0,4,0,PALETTE.red);
      // arms
      add(v,-2,4,0,PALETTE.white); add(v,-2,3,0,PALETTE.white);
      add(v,2,4,0,PALETTE.white); add(v,2,3,0,PALETTE.white);
      // legs puffy
      fillRect(v,{x0:-1,x1:0,y0:-1,y1:2,z0:-1,z1:0,c:PALETTE.white});
      fillRect(v,{x0:1,x1:1,y0:-1,y1:2,z0:-1,z1:0,c:PALETTE.white});
      add(v,-1,-2,0,PALETTE.dark); add(v,1,-2,0,PALETTE.dark);
      return v;
    })()
  },
  {
    id: 'knight',
    name: 'Voxel Knight',
    emoji: '⚔️',
    desc: 'Armored guardian',
    voxels: (()=>{ const v=[];
      fillRect(v,{x0:-1,x1:1,y0:6,y1:8,z0:0,z1:0,c:'#9CA3AF'}); // helmet top
      add(v,0,7,1,'#111'); // visor slit
      fillRect(v,{x0:-1,x1:1,y0:3,y1:5,z0:-1,z1:0,c:PALETTE.blue});
      add(v,0,4,1,PALETTE.gold); // crest
      fillRect(v,{x0:-2,x1:-2,y0:3,y1:5,z0:0,z1:0,c:'#9CA3AF'}); // shoulder
      fillRect(v,{x0:2,x1:2,y0:3,y1:5,z0:0,z1:0,c:'#9CA3AF'});
      add(v,-3,4,0,'#9CA3AF'); // sword
      add(v,-3,5,0,'#E5E7EB'); add(v,-3,6,0,'#E5E7EB'); add(v,-3,3,0,PALETTE.gold);
      add(v,3,4,0,PALETTE.red); add(v,3,3,0,PALETTE.red); // shield
      fillRect(v,{x0:-1,x1:1,y0:-1,y1:2,z0:-1,z1:0,c:'#9CA3AF'});
      add(v,-1,-2,0,'#4B5563'); add(v,1,-2,0,'#4B5563');
      return v;
    })()
  },
  {
    id: 'cat',
    name: 'Neko Cube',
    emoji: '🐱',
    desc: 'Lucky block cat',
    voxels: (()=>{ const v=[];
      // head big
      fillRect(v,{x0:-2,x1:2,y0:5,y1:7,z0:-1,z1:1,c:PALETTE.orange});
      add(v,-2,8,0,PALETTE.orange); add(v,2,8,0,PALETTE.orange); // ears
      add(v,-2,9,0,PALETTE.pink); add(v,2,9,0,PALETTE.pink); // ear inside
      add(v,-1,6,2,PALETTE.black); add(v,1,6,2,PALETTE.black); // eyes
      add(v,0,5,2,PALETTE.pink); // nose
      // body
      fillRect(v,{x0:-1,x1:1,y0:2,y1:4,z0:-1,z1:1,c:PALETTE.white});
      add(v,0,3,2,PALETTE.gold); // bell
      // legs
      add(v,-1,1,1,PALETTE.orange); add(v,1,1,1,PALETTE.orange);
      add(v,-1,0,0,PALETTE.white); add(v,1,0,0,PALETTE.white);
      // tail
      add(v,0,2,-2,PALETTE.orange); add(v,0,3,-3,PALETTE.orange); add(v,1,3,-3,PALETTE.white);
      return v;
    })()
  },
  {
    id: 'invader',
    name: 'Space Invader',
    emoji: '👾',
    desc: 'Retro 8-bit alien',
    voxels: (()=>{ const v=[];
      const pts=[[ -2,4],[-1,4],[0,4],[1,4],[2,4],[-3,3],[3,3],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],[-2,1],[2,1],[-1,0],[1,0]];
      pts.forEach(([x,y])=>{ add(v,x,y,0,PALETTE.green); add(v,x,y,1,PALETTE.green); });
      add(v,-2,5,0,PALETTE.green); add(v,2,5,0,PALETTE.green);
      add(v,-1,3,1,PALETTE.white); add(v,1,3,1,PALETTE.white);
      return v;
    })()
  },
  {
    id: 'golem',
    name: 'Crystal Golem',
    emoji: '🗿',
    desc: 'Floating crystal core',
    voxels: (()=>{ const v=[];
      fillRect(v,{x0:-1,x1:1,y0:0,y1:3,z0:-1,z1:1,c:'#6B7280'});
      fillRect(v,{x0:0,x1:0,y0:4,y1:6,z0:0,z1:0,c:PALETTE.cyan});
      add(v,0,7,0,PALETTE.white); add(v,0,5,1,PALETTE.purple);
      // arms floating
      add(v,-2,2,0,'#6B7280'); add(v,-3,2,0,'#6B7280');
      add(v,2,2,0,'#6B7280'); add(v,3,2,0,'#6B7280');
      // head
      fillRect(v,{x0:-1,x1:1,y0:4,y1:5,z0:-1,z1:0,c:'#374151'});
      add(v,-1,4,1,PALETTE.cyan); add(v,1,4,1,PALETTE.cyan);
      return v;
    })()
  },
  {
    id: 'doge',
    name: 'Voxel Fox',
    emoji: '🦊',
    desc: 'Cute low-poly fox',
    voxels: (()=>{ const v=[];
      fillRect(v,{x0:-1,x1:1,y0:5,y1:7,z0:0,z1:2,c:PALETTE.orange});
      add(v,-1,8,1,PALETTE.orange); add(v,1,8,1,PALETTE.orange);
      add(v,-1,8,1,PALETTE.white); // ear tip
      add(v,0,6,3,PALETTE.white); // snout
      add(v,0,5,3,PALETTE.black);
      fillRect(v,{x0:-1,x1:1,y0:2,y1:4,z0:-1,z1:1,c:PALETTE.orange});
      add(v,0,3,1,PALETTE.white);
      add(v,-1,1,0,PALETTE.white); add(v,1,1,0,PALETTE.white);
      add(v,0,2,-2,PALETTE.orange); add(v,1,2,-3,PALETTE.white);
      return v;
    })()
  },
]

export function generateQRBaseVoxels(matrix, paletteFn) {
  // matrix: 2D boolean array
  const voxels=[]
  const n = matrix.length
  const off = Math.floor(n/2)
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){
    const isDark = matrix[y][x]
    if(isDark){
      // QR pillars: height 1-2 variation for 3D print texture
      const h = 1 + ((x*y)%2)
      for(let k=0;k<h;k++){
        voxels.push({x: x-off, y: k, z: y-off, color: paletteFn(x,y,isDark)})
      }
    } else {
      // white base plate 1 layer
      // we add a floor so STL is manifold? Only for dark? We'll add white base at y=-1
      // handled separately in scene
    }
  }
  return voxels
}
