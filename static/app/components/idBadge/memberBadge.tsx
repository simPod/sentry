import * as React from 'react';
import styled from '@emotion/styled';
import omit from 'lodash/omit';

import UserAvatar from 'sentry/components/avatar/userAvatar';
import Link from 'sentry/components/links/link';
import overflowEllipsis from 'sentry/styles/overflowEllipsis';
import space from 'sentry/styles/space';
import {AvatarUser, Member} from 'sentry/types';

type Props = {
  member: Member;
  avatarSize?: UserAvatar['props']['size'];
  displayName?: React.ReactNode;
  displayEmail?: string;
  orgId?: string;
  useLink?: boolean;
  hideEmail?: boolean;
  className?: string;
};

function getMemberUser(member: Member): AvatarUser {
  if (member.user) {
    return member.user;
  }
  // Adapt the member into a AvatarUser
  return {
    id: '',
    name: member.name,
    email: member.email,
    username: '',
    ip_address: '',
  };
}

const MemberBadge = ({
  avatarSize = 24,
  useLink = true,
  hideEmail = false,
  displayName,
  displayEmail,
  member,
  orgId,
  className,
}: Props) => {
  const user = getMemberUser(member);
  const title =
    displayName ||
    user.name ||
    user.email ||
    user.username ||
    user.ipAddress ||
    // Because this can be used to render EventUser models, or User *interface*
    // objects from serialized Event models. we try both ipAddress and ip_address.
    user.ip_address;

  return (
    <StyledUserBadge className={className}>
      <StyledAvatar user={user} size={avatarSize} />
      <StyledNameAndEmail>
        <StyledName
          useLink={useLink && !!orgId}
          hideEmail={hideEmail}
          to={(member && orgId && `/settings/${orgId}/members/${member.id}/`) || ''}
        >
          {title}
        </StyledName>
        {!hideEmail && <StyledEmail>{displayEmail || user.email}</StyledEmail>}
      </StyledNameAndEmail>
    </StyledUserBadge>
  );
};

const StyledUserBadge = styled('div')`
  display: flex;
  align-items: center;
`;

const StyledNameAndEmail = styled('div')`
  flex-shrink: 1;
  min-width: 0;
  line-height: 1;
`;

const StyledEmail = styled('div')`
  font-size: 0.875em;
  margin-top: ${space(0.25)};
  color: ${p => p.theme.gray300};
  ${overflowEllipsis};
`;

type NameProps = {
  useLink: boolean;
  hideEmail: boolean;
} & Pick<React.ComponentProps<typeof Link>, 'to'>;

const StyledName = styled(({useLink, to, ...props}: NameProps) => {
  const forwardProps = omit(props, 'hideEmail');
  return useLink ? <Link to={to} {...forwardProps} /> : <span {...forwardProps} />;
})`
  font-weight: ${(p: NameProps) => (p.hideEmail ? 'inherit' : 'bold')};
  line-height: 1.15em;
  ${overflowEllipsis};
`;

const StyledAvatar = styled(UserAvatar)`
  min-width: ${space(3)};
  min-height: ${space(3)};
  margin-right: ${space(1)};
`;

export default MemberBadge;
