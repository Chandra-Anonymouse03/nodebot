const axios = require("axios")
const fs = require("fs")
const ffmpeg = require("fluent-ffmpeg")
const chalk = require("chalk")
const moment = require("moment")

const help = require("./lib/help.js")
const settings = JSON.parse(fs.readFileSync("./settings.json"))

module.exports = msgHandler = async (WAConnection, MessageType, Mimetype, msg, client) => {
  try {
    if (!msg.hasNewMessage) return
    if (!msg.messages) return
    m = msg.messages.all()[0]
    if (!m.message) return
    if (m.key && m.key.remoteJid == "status@broadcast") return
    if (m.key.fromMe) return

    let prefix = "#"
    let type = Object.keys(m.message)[0]
    let from = m.key.remoteJid
    let id = m
    let isGroupMsg = from.includes("@g.us")
    let groupData = isGroupMsg ? await client.groupMetadata(from) : ""
    let getGroupAdmin = isGroupMsg ? groupData.participants.filter(x => x.isAdmin === true) : ""
    let groupAdmin = isGroupMsg ? getGroupAdmin.map(x => x.jid) : ""
    let sender = isGroupMsg ? m.participant : from
    let pushname = await client.contacts[sender].notify
    let time = moment(msg.t * 1000).format('HH:mm:ss')
    let quotedMsg = JSON.stringify(m.message)
    let body = (type === "conversation") && m.message.conversation.startsWith(prefix) ? m.message.conversation : (type === "imageMessage") && m.message.imageMessage.caption.startsWith(prefix) ? m.message.imageMessage.caption : (type === "videoMessage") && m.message.videoMessage.caption.startsWith(prefix) ? m.message.videoMessage.caption : (type === "extendedTextMessage") && m.message.extendedTextMessage.text.startsWith(prefix) ? m.message.extendedTextMessage.text : ""
    let command = body.slice(1).trim().split(" ").shift().toLowerCase()
    let isCmd = body.startsWith(prefix)
    let args = body.trim().split(" ").slice(1)
    let q = args.join(" ")
    let groupMembers = isGroupMsg ? groupData.participants : '' // Chan 31/08
    let { text, extendedText, contact, location, liveLocation, image, video, sticker, document, audio, product } = MessageType // Chan 31/08

    let isOwner = settings.ownerNumber.includes(sender)
    let isAdminGroup = groupAdmin.includes(sender)
    let isAdminBotGroup = groupAdmin.includes(client.user.jid)
    let isMediaMsg = (type === "imageMessage" || type === "videoMessage")
    let isQuotedImage = (type === "extendedTextMessage") && quotedMsg.includes("imageMessage")
    let isQuotedVideo = (type === "extendedTextMessage") && quotedMsg.includes("videoMessage")

    if (isCmd && !isGroupMsg) console.log(chalk.yellow("[EXEC] ") + time + chalk.green(" " + prefix + command) + " FROM " + chalk.green(pushname))
    if (isCmd && isGroupMsg) console.log(chalk.yellow("[EXEC] ") + time + chalk.green(" " + prefix + command) + " FROM " + chalk.green(pushname) + " IN " + chalk.green(groupData.subject))

			const reply = (teks) => { // Chan 31/08
				client.sendMessage(from, teks, text, {quoted:m})
			}
			const sendMess = (hehe, teks) => { // Chan 31/08
				client.sendMessage(hehe, teks, text)
			}
			const mentions = (teks, memberr, id) => { // Chan 31/08
				(id == null || id == undefined || id == false) ? client.sendMessage(from, teks.trim(), extendedText, {contextInfo: {"mentionedJid": memberr}}) : client.sendMessage(from, teks.trim(), extendedText, {quoted: m, contextInfo: {"mentionedJid": memberr}})
			}

    let mess = {
      err: `*[ERROR]* Silahkan Lapor Owner!\n• Owner? *${prefix}owner*`,
      grp: {
        notGrp: "Fitur Ini Khusus Group!",
        notAdm: "Kamu Bukanlah Admin Group!",
        notBotAdm: "Jadikan Bot Admin Group!"
      },
      notOwn: "Kamu Bukanlah Owner Bot!"
    }

    // AUTO READ
    client.chatRead(from, "read")

    // ALWAYS ONLINE
    client.updatePresence(from, "available")

    switch (command) {
      case "help":
      case "menu":
        return client.reply(from, help.help(sender, prefix), id)
        break;

     case "owner":
      case "creator":
      case "admin": {
        return client.reply(from, `Terima-kasih Telah Menggunakan Bot Ini\n\n✍🏻 *Developer*: @${settings.devNumber[0].split("@")[0]}\n👤 *Owner*: @${settings.ownerNumber[0].split("@")[0]}`, id)
      }
      break

      // FITUR UTAMA
	case "s":
	case "stiker":
      case "sticker": {
        if (isMediaMsg || isQuotedImage || isQuotedVideo) {
          let encmedia = isQuotedImage ? JSON.parse(JSON.stringify(m).replace("quotedM", "m")).message.extendedTextMessage.contextInfo : m
          return client.sendSticker(from, encmedia, "WhatsApp Bot Sticker", "NodebotJs", id)
        } else { // test
          let encmedia = isQuotedVideo ? JSON.parse(JSON.stringify(m).replace("quotedM", "m")).message.extendedTextMessage.contextInfo : m 
          return client.sendSticker(from, encmedia, "WhatsApp Bot Sticker", "NodebotJs", id)
      }
    }
      break


	// INSTAGRAM
      case "ig":
      case "instagram": {
        try {
        if (args.length === 0) return client.sendMessage(from, "Masukkan Url Instagram!\n\nContoh: *" + prefix + "instagram* https://www.instagram.com/p/CTBia0mhRhu/?utm_medium=copy_link", MessageType.text, { quoted: m, detectLinks: false })
        let { data } = await axios.get("https://api.xteam.xyz/dl/ig?url=" + args[0] + "&APIKEY=" + settings.apiXteam + "")
        let { name, username, likes, caption } = data.result
        let captions = `Name : *${name}*\nUsername : *${username}*\nLikes : *${likes}*\nCaption :\n${caption}`
        for (let i = 0; i < data.result.data.length; i++) {
          if (data.result.data[i].type == "image") {
            await client.sendImage(from, { url: data.result.data[i].data }, captions, id)
          } else {
            await client.sendMessage(from, { url : data.result.data[i].data}, MessageType.video, { quoted: m, caption: captions, mimetype: Mimetype.mp4})
          }
        }
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
      }
    }
      break 


	// TIKTOK
      case "tik": 
      case "tiktok": {
        try {
        if (args.length === 0) return client.sendMessage(from, "Masukkan Url Tiktok!\n\nContoh : *" + prefix + "tiktok* https://vt.tiktok.com/ZSJc2PkTM/", MessageType.text, { quoted: m, detectLinks: true })
        let { data } = await axios.get("https://api.xteam.xyz/dl/tiktok?url=" + args[0] + "&APIKEY=" + settings.apiXteam + "")
        let { server_1 } = data 
        let captions = `Nickname : *${data.info[0].authorMeta.nickName}*\nUsername : *${data.info[0].authorMeta.name}*\nCaption :\n${data.info[0].text}`
        await client.sendMessage(from, { url : server_1 }, MessageType.video, { quoted: m, caption: captions, mimetype: Mimetype.mp4 })
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
      }
    }
      break 
      

	// YT Downloader
	case "yta":
	case "ytaudio":
	case "ytmp3": {
        try {
        if (args.length === 0) return client.reply(from, "Masukkan Url YouTube\n\nContoh : *" + prefix + "ytmp3* https://youtu.be/7zhBmglx6nY", id)
        client.reply(from, mess.wait, id)
        let { data } = await axios.get("https://youtube-media-downloader.shellyschan.repl.co/?url=" + args[0])
        let { judul, deskripsi, thumbnail, audio } = data 
        let captions = `Judul : *${judul}*\nDeskripsi : ${deskripsi}`
        await client.sendImage(from, { url : thumbnail + ".jpeg" }, captions, id)
        await client.sendAudio(from, { url : audio }, judul + ".mp3", id)
      } catch (e) {
        console.log(e)
        client.reply(from, mess.err, id)
      }
    }
      break 
	case "ytv":
	case "ytvideo":
      case "ytmp4": {
        try {
        if (args.length === 0) return client.reply(from, "Masukkan Url YouTube\n\nContoh : *" + prefix + "ytmp4* https://youtu.be/7zhBmglx6nY", id)
        client.reply(from, mess.wait, id)
        let { data } = await axios.get("https://youtube-media-downloader.shellyschan.repl.co/?url=" + args[0])
        let { judul, deskripsi, thumbnail, video } = data 
        let captions = `Judul : *${judul}*\nDeskripsi : ${deskripsi}`
        await client.sendImage(from, { url : thumbnail + ".jpeg" }, captions, id)
        await client.sendVideo(from, { url : video }, null, id)
      } catch (e) {
        console.log(e)
        client.reply(from, mess.err, id)
      }
    }
      break 

      // FITUR GROUP 
      case "add": {
        try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
        if (!isAdminBotGroup) return client.reply(from, mess.grp.notBotAdm, id)
        if (!q) return client.reply(from, "Masukkan Nomor Target!\n\nContoh : *" + prefix + "add* 628×××", id)
        return client.groupAdd(from, [q + "@s.whatsapp.net"])
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
      }
    }
      break 

     case "facebook": 
      case "fb": {
        try {
        if (args.length === 0) return client.reply(from, "Masukkan Url Facebook\n\nContoh : *" + prefix + "fb* https://www.facebook.com/botikaonline/videos/837084093818982", id)
        client.reply(from, mess.wait, id)
        let { data } = await axios.get("https://api.xteam.xyz/dl/fbv2?url=" + args[0] + "&APIKEY=" + settings.apiXteam + "")
        let { hd } = data.result
        let captions = `Judul : *${data.result.meta.title}*`
        await client.sendVideo(from, { url : hd.url }, captions, id)
      } catch (e) {
        console.log(e)
        client.reply(from, mess.err, id)
      }
    }
      break 
      case "igstalk":
      case "igprofile": {
        try {
        if (args.length === 0) return client.reply(from, "Masukkan Username Instagram\n\nContoh : *" + prefix + "igprofile* nezuko.chan.12", id)
        let { data } = await axios.get("https://api.xteam.xyz/dl/igstalk?nama=" + args[0] + "&APIKEY=" + settings.apiXteam + "")
        let { username, full_name, follower_count, following_count, biography, hd_profile_pic_url_info } = data.result.user
        let captions = `Username : *${username}*\nFull Name : *${full_name}*\nFollower : *${follower_count}*\nFollowing : *${following_count}*\nBio : *${biography}*`
        await client.sendImage(from, { url : hd_profile_pic_url_info.url }, captions, id)
      } catch (e) {
        console.log(e)
        client.reply(from, mess.err, id)
      }
    }
      break

     case "nulis": {
        try {
        if (args.length === 0) return client.reply(from, "Masukkan Text\n\nContoh : *" + prefix + "nulis* NezukoChans", id) 
        return client.sendImage(from, { url : "https://api.xteam.xyz/magernulis2?text=" + q + "&APIKEY=" + settings.apiXteam + "" }, "Done Kak @" + sender.split("@")[0], id)
      } catch (e) {
        console.log(e)
        client.reply(from, mess.err, id)
      }
    }
      break
        /* case "kick": {
        try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
        if (!isAdminBotGroup) return client.reply(from, mess.grp.notBotAdm, id)
        if (!q) return client.reply(from, "Masukkan Nomor Target!\n\nContoh : *" + prefix + "kick* 628×××", id)
        return client.groupRemove(from, [q + "@s.whatsapp.net"])
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
      }
    }
    break 
    */
    case "kick": { // Chan 31/08
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
        if (!isAdminBotGroup) return client.reply(from, mess.grp.notBotAdm, id)
        if (!q) return client.reply(from, "Tag Nomor Target!\n\nContoh : *" + prefix + "kick* @user", id)
        if (!m.message.extendedTextMessage) return client.reply(from, "Tag Nomor Target!\n\nContoh : *" + prefix + "kick* @user", id) 
        return client.groupRemove(from, m.message.extendedTextMessage.contextInfo.mentionedJid)
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
      }
    }
    break


    case "promote": {
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
        if (!isAdminBotGroup) return client.reply(from, mess.grp.notBotAdm, id)
        if (!q) return client.reply(from, "Tag Nomor Target!\n\nContoh : *" + prefix + "promote* @user", id)
        if (!m.message.extendedTextMessage) return client.reply(from, "Tag Nomor Target!\n\nContoh : *" + prefix + "add* @user", id) 
        return client.groupMakeAdmin(from, m.message.extendedTextMessage.contextInfo.mentionedJid)
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
      }
    }
    break 
    case "demote": {
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
        if (!isAdminBotGroup) return client.reply(from, mess.grp.notBotAdm, id)
        if (!q) return client.reply(from, "Tag Nomor Target!\n\nContoh : *" + prefix + "demote* @user", id)
        if (!m.message.extendedTextMessage) return client.reply(from, "Tag Nomor Target!\n\nContoh : *" + prefix + "demote* @user", id) 
        return client.groupDemoteAdmin(from, m.message.extendedTextMessage.contextInfo.mentionedJid)
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
      }
    }
    break

	case "tagall": { // Chan 31/08
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
	members_id = []
	teks = (args.length > 1) ? body.slice(8).trim() : ''
	teks += '\n\n'
	for (let mem of groupMembers) {
		teks += `*-* @${mem.jid.split('@')[0]}\n`
		members_id.push(mem.jid)
		}
		mentions(teks, members_id, true)
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
       }
     }
	break

	case "tagall2": { // Chan 31/08
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
	members_id = []
	teks = (args.length > 1) ? body.slice(8).trim() : ''
	teks += '\n\n'
	for (let mem of groupMembers) {
			teks += `-> @${mem.jid.split('@')[0]}\n`
			members_id.push(mem.jid)
			}
			mentions(teks, members_id, false)
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
       }
     }
	break

	case "tagall3": { // Chan 31/08
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
	members_id = []
	teks = (args.length > 1) ? body.slice(8).trim() : ''
	teks += '\n\n'
	for (let mem of groupMembers) {
		teks += `=> wa.me/${mem.jid.split('@')[0]}\n`
		members_id.push(mem.jid)
		}
		client.sendMessage(from, teks, text, {detectLinks: false, quoted: m})
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
       }
     }
	break

	case "linkgc": // Chan 31/08
	case "linkgrup":
	case "linkgroup":
	case "linkgroups": {
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
        if (!isAdminBotGroup) return client.reply(from, mess.grp.notBotAdm, id)
                    let linkgc = await client.groupInviteCode(from)
                    reply('https://chat.whatsapp.com/'+linkgc)
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
       }
     }
       break

	case "revoke": // Chan 31/08
	case "revokelink": {
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
        if (!isAdminBotGroup) return client.reply(from, mess.grp.notBotAdm, id)
	let res = await client.revokeInvite(from)
                    reply('https://chat.whatsapp.com/'+ res.code)
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.err, MessageType.text, { quoted: m })
       }
     }
       break


	case "leavegc": // Chan 31/08
	case "leave": {
        try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
                    if (!isAdminGroup || !isOwner) {
                    	client.groupLeave(from)
			}
      } catch (e) {
        console.log(e)
        client.sendMessage(from, mess.grp.notAdm, MessageType.text, { quoted: m })
       }
     }
	break

    case "settname" : {
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
        if (!isAdminBotGroup) return client.reply(from, mess.grp.notBotAdm, id)
        if (args.length === 0) return client.reply(from, "Masukkan Nama Group Yang baru!\n\nContoh : *" + prefix + "settname* Nama Group Yang Baru", id)
        return client.groupUpdateSubject(from, q)
      } catch (e) {
        console.log(e)
        client.reply(from, mess.err, id)
      }
    }
    break
      case "settdesc": {
      try {
        if (!isGroupMsg) return client.reply(from, mess.grp.notGrp, id)
        if (!isAdminGroup) return client.reply(from, mess.grp.notAdm, id)
        if (!isAdminBotGroup) return client.reply(from, mess.grp.notBotAdm, id)
        if (args.length === 0) return client.reply(from, "Masukkan Deskripsi Group Yang baru!\n\nContoh : *" + prefix + "settdesc* Deskripsi Group Yang Baru", id)
        return client.groupUpdateDescription(from, q)
      } catch (error) {
        console.log(e)
        client.reply(from, mess.err, id)
      }
    }
    break  

        
        
/* Default */
      default:
        console.log(chalk.redBright("[ERROR] UNREGISTERED COMMAND FROM " + pushname))
    }
  } catch (e) {
    console.log(e)
  }
}
