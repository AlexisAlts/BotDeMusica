const Discord = require('discord.js');
const client = new Discord.Client
const { MessageEmbed } = require("discord.js");
const config = require("./config.json");
const buscador_letra = require("buscador-letra"); 
const ytdl = require('ytdl-core');
const YouTube = require('simple-youtube-api')

let Google_API = config.keytube 
let buscador = new buscador_letra(config.keylirys);
let prefix = config.prefix

const youtube = new YouTube(Google_API)

    const queue = new Map()

    client.on('ready', () => {
        console.log(`Que empiece la fiesta!`);
        client.user.setActivity("Musica 🔊", {type: "LISTENING"}); 
    })      

client.on('message', async message => {
    if(message.author.bot) return;
    if(message.channel.type === 'dm') return;
  
  const args = message.content.substring(prefix.length).split(" ")
  const searchString = args.slice(1).join(' ')
  const url = args[1] ? args[1].replace(/<(._)>/g, '$1') : ''
  const serverQueue = queue.get(message.guild.id)
  
  if(message.content.startsWith(`${prefix}play`)) {
    const voiceChannel = message.member.voice.channel
    if(!voiceChannel) return message.channel.send('No estas en un canal de voz.')
    const permissions = voiceChannel.permissionsFor(message.client.user)
    if(!permissions.has('CONNECT')) return message.channel.send('No tengo permisos para conectarme :( ')
    if(!permissions.has('SPEAK')) return message.channel.send('No tengo permisos para hablar :( ')
  
    if(url.match(/https?:\/\/(www.youtube.com|youtube.com)\/playlist(.+)$/)) {
     const playlist = await youtube.getPlaylist(url)
     const video = await playlist.getVideos()
     for (const video of Object.values(videos)) {
         const video2 = await youtube.getVideoByID(video.id)
         await handleVideo(video2, message, voiceChannel, true)
     }
  
  
    } else {
  
      try {
          var video = await youtube.getVideoByID(url)
          } catch {
          try {
            var videos = await youtube.searchVideos(searchString, 1)
            var video = await youtube.getVideoByID(videos[0].id)
          } catch {
            return message.channel.send("No he encontrado resultados.")
        }
      } 
      return handleVideo(video, message, voiceChannel)
    }
  
  } else if (message.content.startsWith(`${prefix}stop`)) {
    if(!message.member.voice.channel) return message.channel.send('Deves estar en un canal de voz para detener')
    if(!serverQueue) return message.channel.send("No estas reproduciendo nada en este momento")
    serverQueue.songs = []
    serverQueue.connection.dispatcher.end()
    message.channel.send("Cancion detenida.")
    return undefined
  } else if (message.content.startsWith(`${prefix}skip`)) {
    if(!message.member.voice.channel) return message.channel.send("No estas en un canal de voz.")
    if(!serverQueue) return message.channel.send("No estas escuchando nada en este momento.")
    serverQueue.connection.dispatcher.end()
    message.channel.send("Se ha saltado la cancion.")
    return undefined
  } else if (message.content.startsWith(`${prefix}volume`)) {
    if(!message.member.voice.channel) return message.channel.send("No estas en un canal de voz.")
    if(!serverQueue) return message.channel.send("No estas escuchando nada.")
    if(!args[1]) return message.channel.send(`Volumen actual: **${serverQueue.volume}**`)
    if(!isNaN(args[1])) return message.channel.send("Coloca un numero de 1 a 200")
    serverQueue.volume = args[1]
    serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5)
    message.channel.send(`El volumen fue cambiado a: **${args[1]}**`)
    return undefined
  } else if (message.content.startsWith(`${prefix}nowplay`)) {
    if(!serverQueue) return message.channel.send("No hay nada reproduciendoce")
    message.channel.send(`Now Playing: **${serverQueue.songs[0].title}**`)
    return undefined
  } else if (message.content.startsWith(`${prefix}queue`)) {
    if(!serverQueue) return message.channel.send("No hay nada en la cola")
    message.channel.send(`
    **Song Queue**
    ${serverQueue.songs.map(song => `${song.title}`).join(`\n`)}
    `, {split: true })
    return undefined
  } else if(message.content.startsWith(`${prefix}pause`)) {
    if(!message.member.voice.channel) return message.channel.send("No estas en un canal de voz")
    if(!serverQueue) return message.channel.send("No hay nada reproduciendo nada")
    if(!serverQueue.playing) return message.channel.send("No hay nada reproduciendoce actualmente")
    serverQueue.playing = false
    serverQueue.connection.dispatcher.pause()
    message.channel.send("cancion pausada!")
    return undefined
  } else if(message.content.startsWith(`${prefix}resume`)) {
    if(!message.member.voice.channel) return message.channel.send("No estas en un canal de voz")
    if(!serverQueue) return message.channel.send("No hay nada en la cola")
    if(!serverQueue.playing) return message.channel.send("Hay una cansion reproduciendoce actualmente")
    serverQueue.playing = true
    serverQueue.connection.dispatcher.resume()
    message.channel.send("cancion reanudada!")
    return undefined
  
} else if(message.content.startsWith(`${prefix}letra`)) { 
    let nombre = args.slice(1).join(" ")
    if (!nombre) return message.channel.send("Coloca la cansion a buscar la letra.")
    let resultados = await buscador.buscar(nombre);
    if (resultados.length == 0) return message.reply("No se ha encontrado nada");
    let letra = await buscador.letra(resultados[0]);
    let embed = new Discord.MessageEmbed() 
        .setColor("RANDOM") 
        .setTitle(resultados[0].titulo + " de " + resultados[0].artista); 
 
        if (letra.length <= 2048) embed.setDescription(letra);
        else { 
            let chunks = letra.match(/[\s\S]{1,1023}/g); 
 
            for (let chunk of chunks) embed.addField("\u200b", chunk, false);
        }
        if (embed.length > 6000) return message.reply("La letra es demasiado larga");
        return message.reply(embed);
        

   }
      return undefined
  })

  
  async function handleVideo(video, message, voiceChannel, playlist = false) {
      const serverQueue = queue.get(message.guild.id)
  
      const song = {
          id: video.id,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.id}`
          }  
          
            if(!serverQueue) {
                const queueConstruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
          
                }
                queue.set(message.guild.id, queueConstruct)
          
                queueConstruct.songs.push(song)
          
            try {
                var connection = await voiceChannel.join()
                queueConstruct.connection = connection
                play(message.guild, queueConstruct.songs[0])
            } catch (error) {
                console.log('He tenido un error')
                queue.delete(message.guild.id)
                return message.channel.send('He tenido un error!')
            }
          } else {
            serverQueue.songs.push(song)
            if(playlist) return undefined
            else return message.channel.send(`**${song.title}** ha sido añanido a la lista`)
          }      
          return undefined
          
  }
  
  function play(guild, song) {
  const serverQueue = queue.get(guild.id)
  
  if(!song) {
    serverQueue.voiceChannel.leave()
    queue.delete(guild.id)
    return
  }
  const dispatcher = serverQueue.connection.play(ytdl(song.url))
  .on('finish', () => {
    serverQueue.songs.shift()
    play(guild, serverQueue.songs[0])
  })
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)
  serverQueue.textChannel.send(`estas escuchando **${song.title}**`)
  }
  
  
  client.login(config.token);