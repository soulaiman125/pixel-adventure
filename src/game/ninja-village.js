export const VILLAGE_STATIONS = [
  {x:105,id:'blacksmith',name:'Blacksmith',npc:'Hana',line:'A weapon should fit your stride. Try another style in the dojo.'},
  {x:200,id:'dojo',name:'Training Dojo',npc:'Instructor Ren',line:'Practice your combo here. A well-timed parry gives you one countercut.'},
  {x:295,id:'quests',name:'Quest Board',npc:'Scout Toma',line:'The crossing teams post requests here. Claim rewards after you finish a trial.'},
  {x:389,id:'outfits',name:'Outfit Shop',npc:'Iris',line:'Mastery changes your colors. Every outfit has the same defenses.'},
  {x:485,id:'worlds',name:'World Portal',npc:'Gatekeeper Noa',line:'Choose an unlocked realm. I can open the portal from anywhere in the village.'},
  {x:573,id:'hall',name:'Hall of Legends',npc:'Archivist Sora',line:'I keep the record of every seal you broke. You can revisit a defeated guardian.'},
];
export const NINJA_VILLAGE = {
  name:'Ninja Village',theme:'jungle',realm:'bamboo',village:true,width:654,spawnX:51,
  ground:[[0,654]],platforms:[[134,149,31],[270,152,42],[444,147,38]],
  hazards:[],coins:[],enemies:[],trees:[[28,.72],[646,.68]],
};

export function paintVillage(scene) {
  const art=scene.add.graphics().setDepth(-.5);
  for(const [i,station] of VILLAGE_STATIONS.entries()){
    const {x}=station;
    art.fillStyle(0x232338).fillTriangle(x-38,150,x,116-i%2*6,x+39,150)
      .fillRect(x-30,150,60,34).fillStyle(0x745b68).fillTriangle(x-35,146,x,121-i%2*6,x+35,146)
      .fillStyle(0xb29470).fillRect(x-27,150,55,3).fillStyle(0x524358).fillRect(x-23,154,46,30)
      .fillStyle(0x292439).fillRect(x-9,158,18,26)
      .fillStyle(0xe7ac78).fillRect(x-23,150,4,10).fillRect(x+20,150,4,10);
    scene.add.text(x,136,station.name,{fontFamily:'monospace',fontSize:'6px',color:'#ffe7c5',stroke:'#282438',strokeThickness:2})
      .setOrigin(.5,1).setDepth(1);
    const person=scene.add.graphics().setDepth(2);
    person.fillStyle(0x242337).fillRect(x+19,169,8,15)
      .fillStyle([0xd38a79,0x9ea9da,0x9adebb][i%3]).fillRect(x+20,174,6,7)
      .fillStyle(0xe9b28f).fillRect(x+21,170,4,4);
  }
}
