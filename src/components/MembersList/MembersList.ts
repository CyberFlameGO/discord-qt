import { BrushStyle, ContextMenuPolicy, QAction, QApplication, QBrush, QClipboardMode, QColor, QListWidget, QListWidgetItem, QMenu, QPoint, QSize, ScrollBarPolicy, Shape } from '@nodegui/nodegui';
import { TextChannel } from 'discord.js';
import { app, MAX_QSIZE } from '../..';
import { Events } from '../../structures/Events';
import { CancelToken } from '../../utilities/CancelToken';
import { createLogger } from '../../utilities/Console';
import { ViewOptions } from '../../views/ViewOptions';
import { UserButton } from '../UserButton/UserButton';
import { __ } from 'i18n';

const { debug } = createLogger('[MembersList]');
export class MembersList extends QListWidget {
  private cancelToken?: CancelToken;
  private channel?: TextChannel;

  private menu = new QMenu(this);
  private p0 = new QPoint(0, 0);
  private active?: UserButton;
  private clipboard = QApplication.clipboard();

  constructor() {
    super();
    this.setObjectName('MembersList');
    this.setFrameShape(Shape.NoFrame);
    this.setSelectionRectVisible(false);
    this.setHorizontalScrollBarPolicy(ScrollBarPolicy.ScrollBarAlwaysOff);
    this.setMinimumSize(240, 0);
    this.setMaximumSize(240, MAX_QSIZE);
    this.initMenu();

    app.on(Events.SWITCH_VIEW, (view: string, options?: ViewOptions) => {
      if (view === 'dm' || view === 'guild' && !options?.channel) return this.hide();
      if (view !== 'guild' || !options?.channel) return;
      if (this.cancelToken) this.cancelToken.cancel();
      const cancel = new CancelToken();
      if (options.channel !== this.channel)
        this.loadList(options.channel, cancel);
      this.cancelToken = cancel;
      this.show()
    })
  }

  private initMenu() {
    const { menu, clipboard } = this;
    {
      const item = new QAction();
      item.setText('Message');
      item.addEventListener('triggered', async () => {
        if (!this.active) return;
        app.emit(Events.SWITCH_VIEW, 'dm', { dm: await this.active.user?.createDM() })
      });
      menu.addAction(item);
    }
    menu.addSeparator();
    {
      const item = new QAction();
      item.setText(__('COPY_ID'));
      item.addEventListener('triggered', async () => {
        if (!this.active || !this.active.user) return;
        clipboard.setText(this.active.user.id, QClipboardMode.Clipboard);
      });
      menu.addAction(item);
    }
  }
  private ratelimit = false;
  private rateTimer?: NodeJS.Timer;
  private async loadList(channel: TextChannel, token: CancelToken) {
    const { menu } = this;

    if (this.ratelimit || this.channel === channel) return;
    this.ratelimit = true;
    if (this.rateTimer) clearTimeout(this.rateTimer);

    debug(`Loading members list for #${channel.name} (${channel.id})...`);
    this.channel = channel;
    this.clear();
    for (const member of channel.members.values()) {
      const btn = new UserButton(this);
      const item = new QListWidgetItem();
      item.setSizeHint(new QSize(224, 44));
      item.setFlags(0);
      item.setBackground(new QBrush(new QColor('transparent'), BrushStyle.NoBrush));
      btn.loadUser(member);
      btn.setContextMenuPolicy(ContextMenuPolicy.CustomContextMenu);
      btn.addEventListener('clicked', async () => {
        const { miniProfile } = app.window.dialogs;
        const map = btn.mapToGlobal(this.p0);
        map.setX(map.x() - 250);
        miniProfile.loadProfile(member)
        miniProfile.popup(map);
      });

      btn.addEventListener('customContextMenuRequested', ({ x, y }) => {
        this.active = btn;
        menu.popup(btn.mapToGlobal(new QPoint(x, y)));
      });
      btn.loadAvatar();
      this.addItem(item);
      this.setItemWidget(item, btn);
    }
    debug(`Finished loading members list.`);
    this.rateTimer = setTimeout(() => this.ratelimit = false, 500);
  }
}