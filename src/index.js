import { verifyKey } from 'discord-interactions'

export default {
	async fetch(request, env, ctx) {
		if (request.method === 'POST') {
			if (!request.headers.get('x-signature-ed25519') || !request.headers.get('x-signature-timestamp')) return Response.redirect('https://discord.com')
			const body = await request.clone().arrayBuffer()
      		const signature = request.headers.get('x-signature-ed25519')
      		const timestamp = request.headers.get('x-signature-timestamp')
			if (
				!verifyKey(
					body,
					signature,
					timestamp,
					env.PUBLIC_KEY
				)
			) {
				return new Response('', { status: 401 })
			}
	
			const message = await request.json()
	
			if (message.type === 1) {
				return new Response(JSON.stringify({
						type: 1
				}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })
			}
			console.log(JSON.stringify(message))
			const command = message.data.custom_id.split('-')[0]
			const id = message.data.custom_id.split('-')[1]
			const param = message.data.custom_id.split('-')[2]
			console.log(`User ID: ${id}`)

			if (command === 'deny') {

				await env.USERS.delete(id)
				
				return new Response(JSON.stringify({
					type: 7,
					data: {
						components: [
							{
								type: 1,
								components: [
									{
										type: 2,
										label: 'Request denied.',
										style: 4,
										custom_id: 'na',
										disabled: true
									}
								]
							}
						],
						embeds: message.message.embeds
					}
				}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })
			}

			if (command === 'ban') {
				await env.USERS.put(id, 'BANNED')
				
				return new Response(JSON.stringify({
					type: 7,
					data: {
						components: [
							{
								type: 1,
								components: [
									{
										type: 2,
										label: 'User banned.',
										style: 4,
										custom_id: 'na',
										disabled: true
									}
								]
							}
						],
						embeds: message.message.embeds
					}
				}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })
			}

			if (command === 'close') {

				let r = await fetch(
					`https://discord.com/api/channels/${param}/recipients/${id}`,
					{
						method: 'DELETE',
						headers: {
							'content-type': 'application/json',
							authorization: `Bot ${env.AUTH_TOKEN}`
						}
					}
				)

				if (r.status > 299) {
					console.log(`${r.status} ${r.statusText}`)
				}

				r = await fetch(
					`https://discord.com/api/channels/${param}/recipients/${env.OWNER_ID}`,
					{
						method: 'DELETE',
						headers: {
							'content-type': 'application/json',
							authorization: `Bot ${env.AUTH_TOKEN}`
						}
					}
				)

				if (r.status > 299) {
					console.log(`${r.status} ${r.statusText}`)
				}

				await env.USERS.delete(id)

				console.log('DM closed.')
				
				return new Response(JSON.stringify({
					type: 7,
					data: {
						components: [
							{
								type: 1,
								components: [
									{
										type: 2,
										label: 'DM Closed',
										style: 4,
										custom_id: 'na',
										disabled: true
									}
								]
							}
						],
						embeds: message.message.embeds
					}
				}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })

			}

			if (command === 'accept') {
				const USER = JSON.parse(await env.USERS.get(id))
				let owner = JSON.parse(await env.USERS.get(env.OWNER_ID))
				console.log(JSON.stringify(USER))
				const oauthParams = new URLSearchParams()
				oauthParams.append('client_id', env.APP_ID)
				oauthParams.append('client_secret', env.CLIENT_SECRET)
				oauthParams.append('grant_type', 'refresh_token')
				oauthParams.append('refresh_token', owner.refresh_token)

				let r = await fetch(
					'https://discord.com/api/v10/oauth2/token',
					{
						method: 'POST',
						body: oauthParams,
						headers: {
							'content-type': 'application/x-www-form-urlencoded'
						}
					}
				)

				if (r.status > 299) {
					console.log(`${r.status} ${r.statusText}`)
				}

				owner = await r.json()
				await env.USERS.put(env.OWNER_ID, JSON.stringify(owner))

				r = await fetch(
					'https://discord.com/api/users/@me/channels',
					{
						method: 'POST',
						body: JSON.stringify({
							access_tokens: [
								owner.access_token,
								USER.token
							]
						}),
						headers: {
							'content-type': 'application/json',
							authorization: `Bot ${env.AUTH_TOKEN}`
						}
					}
				)

				if (r.status > 299) {
					console.log(`${r.status} ${r.statusText}`)
				}

				const CHANNEL = await r.json()
				
				return new Response(JSON.stringify({
					type: 7,
					data: {
						components: [
							{
								type: 1,
								components: [
									{
										type: 2,
										label: 'See DM',
										style: 5,
										url: `discord://-/channels/@me/${CHANNEL.id}`
									},
									{
										type: 2,
										label: 'Close DM',
										style: 2,
										custom_id: `close-${USER.user.id}-${CHANNEL.id}`
									},
									{
										type: 2,
										label: 'Ban',
										style: 4,
										custom_id: `ban-${USER.user.id}`
									}
								]
							}
						],
						embeds: message.message.embeds
					}
				}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })
			}
		}
		if (request.method === 'GET') {
			const requestUrl = new URL(request.url)
			if (!requestUrl.searchParams.get('code')) return Response.redirect(env.OAUTH_URL)
			const OAUTH_DATA = {
				code: requestUrl.searchParams.get('code'),
			}
			const oauthParams = new URLSearchParams()
      		oauthParams.append('client_id', env.APP_ID)
      		oauthParams.append('client_secret', env.CLIENT_SECRET)
      		oauthParams.append('grant_type', 'authorization_code')
      		oauthParams.append('code', OAUTH_DATA.code)
      		oauthParams.append('redirect_uri', env.REDIRECT_URL)

			let r = await fetch(
				'https://discord.com/api/v10/oauth2/token',
				{
					method: 'POST',
					body: oauthParams,
					headers: {
						'content-type': 'application/x-www-form-urlencoded'
					}
				}
			)

			let data = await r.json()
			OAUTH_DATA.token = data.access_token
			OAUTH_DATA.refresh_token = data.refresh_token
			OAUTH_DATA.requested = Math.round((new Date()).getTime() / 1000)
			OAUTH_DATA.expires_at = OAUTH_DATA.requested + data.expires_in

			r = await fetch(
				'https://discord.com/api/v10/users/@me',
				{
					headers: {
						authorization: `Bearer ${OAUTH_DATA.token}`
					}
				}
			)

			OAUTH_DATA.user = await r.json()

			r = await fetch(
				'https://discord.com/api/v10/users/@me/connections',
				{
					headers: {
						authorization: `Bearer ${OAUTH_DATA.token}`
					}
				}
			)

			OAUTH_DATA.connections = await r.json()

			console.log(JSON.stringify(OAUTH_DATA))

			if (!OAUTH_DATA.user.verified || !OAUTH_DATA.user.mfa_enabled) return Response.redirect(env.FAIL_URL)

			if (await env.USERS.get(OAUTH_DATA.user.id)) return Response.redirect(env.FAIL_URL)

			const FIELDS = [
				{
					name: 'Contact information',
					value: `Email: ||${OAUTH_DATA.user.email}||\nDiscord: <discord://-/users/${OAUTH_DATA.user.id}>\nMention: <@${OAUTH_DATA.user.id}>`,
					inline: true
				}
			]

			let connectionsString = ''
			if (OAUTH_DATA.connections) {
				for (const connection of OAUTH_DATA.connections) {
					if (connection.visibility === 0) continue
					connectionsString += `**${connection.type}**: \`${connection.name}\`\n`
				}
			}

			if (connectionsString != '') {
				FIELDS.push({
					name: 'Connections',
					value: connectionsString,
					inline: true
				})
			}

			const EMBED = {
				title: 'New contact request',
				description: `${OAUTH_DATA.user.username}#${OAUTH_DATA.user.discriminator} reached out!\n\nContact request made <t:${OAUTH_DATA.requested}:R> and expires <t:${OAUTH_DATA.expires_at}:R>`,
				fields: FIELDS
			}

			r = await fetch(
				`https://discord.com/api/v10/channels/${env.DM_CHANNEL}/messages`,
				{
					method: 'POST',
					body: JSON.stringify({
						embeds: [EMBED],
						components: [
							{
								type: 1,
								components: [
									{
										type: 2,
										label: 'Accept',
										style: 3,
										custom_id: `accept-${OAUTH_DATA.user.id}`
									},
									{
										type: 2,
										label: 'Deny',
										style: 2,
										custom_id: `deny-${OAUTH_DATA.user.id}`
									},
									{
										type: 2,
										label: 'Ban',
										style: 4,
										custom_id: `ban-${OAUTH_DATA.user.id}`
									}
								]
							}
						]
					}),
					headers: {
						'content-type': 'application/json',
						'authorization': `Bot ${env.AUTH_TOKEN}`
					}
				}
			)

			if (r.status > 299) {
				console.log(`${r.status} ${r.statusText}\n\n${await r.text()}`)
				return Response.redirect(env.OAUTH_URL)
			}

			await env.USERS.put(OAUTH_DATA.user.id, JSON.stringify(OAUTH_DATA), {expiration: OAUTH_DATA.expires_at})

			return Response.redirect(env.SUCCESS_URL)
		}
	},
};
