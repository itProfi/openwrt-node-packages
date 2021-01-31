# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.
#

include $(TOPDIR)/rules.mk

PKG_NPM_NAME:=node-red-contrib-blockly
PKG_NAME:=$(PKG_NPM_NAME)
PKG_VERSION:=1.1.0
PKG_RELEASE:=1

PKG_SOURCE:=$(PKG_NPM_NAME)-$(PKG_VERSION).tgz
PKG_SOURCE_URL:=https://registry.npmjs.org/$(PKG_NPM_NAME)/-/
PKG_HASH:=f1d7c832a4085dbf018801d0d940f06297661ad75af4c545c68b429b452b6805

PKG_MAINTAINER:=bartbutenaers
PKG_LICENSE:=Apache-2.0 License
PKG_LICENSE_FILES:=LICENSE

PKG_BUILD_DEPENDS:=node/host
PKG_BUILD_PARALLEL:=1
PKG_USE_MIPS16:=0

include $(INCLUDE_DIR)/package.mk

define Package/node-red-contrib-blockly
  SUBMENU:=Node.js
  SECTION:=lang
  CATEGORY:=Languages
  TITLE:=The module allows you to use Node-Red together with the Yandex.Alice voice assistant service
  URL:=https://flows.nodered.org/node/node-red-contrib-blockly
  DEPENDS:=+node +node-npm
endef

define Package/node-red-contrib-blockly/description
  A Node Red node that offers a visual programming interface, to make programming a function node easier.
endef

TARGET_CFLAGS+=$(FPIC)
TARGET_CPPFLAGS+=$(FPIC)

define Package/node-red-contrib-blockly/install
	$(INSTALL_DIR) $(1)/usr/lib/node
	$(CP) $(PKG_INSTALL_DIR)/usr/lib/node_modules/* $(1)/usr/lib/node/
	$(INSTALL_DIR) $(1)/usr/bin
	$(LN) ../lib/node/node-red-contrib-blockly/blockly.js $(1)/usr/bin/blockly
endef
$(eval $(call BuildPackage,node-red-contrib-blockly))
