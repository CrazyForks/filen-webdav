import SDK, { type FilenSDKConfig } from "@filen/sdk"
import * as WebDAV from "@filen/webdav-server"
import FileSystem from "./filesystem"
import StorageManager from "./filesystem/storageManager"

process.removeAllListeners("warning")

export type WebDAVUser = {
	name: string
	password: string
	isAdmin: boolean
	rights?: WebDAV.BasicPrivilege[] | string[]
}

/**
 * WebDAVServer
 * @date 2/23/2024 - 5:50:56 AM
 *
 * @export
 * @class WebDAVServer
 * @typedef {WebDAVServer}
 */
export class WebDAVServer {
	private readonly sdk: SDK
	private readonly webdavServer: WebDAV.WebDAVServer

	/**
	 * Creates an instance of WebDAVServer.
	 *
	 * @constructor
	 * @public
	 * @param {{
	 * 		users: WebDAVUser[]
	 * 		hostname?: string
	 * 		port?: number
	 * 		sdkConfig: FilenSDKConfig
	 * 		tmpDir?: string
	 * 	}} param0
	 * @param {{}} param0.users
	 * @param {string} param0.hostname
	 * @param {number} param0.port
	 * @param {FilenSDKConfig} param0.sdkConfig
	 * @param {string} param0.tmpDir
	 */
	public constructor({
		users,
		hostname,
		port,
		sdkConfig,
		tmpDir
	}: {
		users: WebDAVUser[]
		hostname?: string
		port?: number
		sdkConfig: FilenSDKConfig
		tmpDir?: string
	}) {
		this.sdk = new SDK(sdkConfig)

		const userManager = new WebDAV.SimpleUserManager()
		const privilegeManager = new WebDAV.SimplePathPrivilegeManager()

		for (const user of users) {
			const usr = userManager.addUser(user.name, user.password, user.isAdmin)

			privilegeManager.setRights(usr, "/", user.rights ? user.rights : ["all"])
		}

		this.webdavServer = new WebDAV.WebDAVServer({
			hostname,
			privilegeManager,
			requireAuthentification: true,
			maxRequestDepth: Infinity,
			httpAuthentication: new WebDAV.HTTPDigestAuthentication(userManager, "Default realm"),
			port: port ? port : 1901,
			rootFileSystem: new FileSystem({
				sdk: this.sdk,
				tmpDir
			}),
			storageManager: new StorageManager({ sdk: this.sdk })
		})

		if (process.env.NODE_ENV === "development") {
			setInterval(() => {
				console.log("[WEBDAVWORKER.MEM.USED]", `${(process.memoryUsage().heapUsed / 1000 / 1000).toFixed(2)} MB`)
				console.log("[WEBDAVWORKER.MEM.TOTAL]", `${(process.memoryUsage().heapTotal / 1000 / 1000).toFixed(2)} MB`)
			}, 5000)
		}
	}

	/**
	 * Initialize the WebDAV worker.
	 * @date 2/23/2024 - 5:51:12 AM
	 *
	 * @public
	 * @async
	 * @returns {Promise<void>}
	 */
	public async initialize(): Promise<void> {
		await new Promise<void>(resolve => {
			this.webdavServer.start(() => {
				resolve()
			})
		})
	}
}

export default WebDAVServer