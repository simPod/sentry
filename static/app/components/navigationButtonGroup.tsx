import {LocationDescriptor} from 'history';

import Button from 'sentry/components/button';
import ButtonBar from 'sentry/components/buttonBar';
import {IconNext, IconPrevious} from 'sentry/icons';
import {t} from 'sentry/locale';

type Props = {
  /**
   * A set of LocationDescriptors that will be used in the buttons in the following order:
   * [Oldest, Older, Newer, Newest]
   */
  links: [LocationDescriptor, LocationDescriptor, LocationDescriptor, LocationDescriptor];
  hasNext?: boolean;
  hasPrevious?: boolean;
  className?: string;
  size?: React.ComponentProps<typeof Button>['size'];
  onOldestClick?: () => void;
  onOlderClick?: () => void;
  onNewerClick?: () => void;
  onNewestClick?: () => void;
};

const NavigationButtonGroup = ({
  links,
  hasNext = false,
  hasPrevious = false,
  className,
  size,
  onOldestClick,
  onOlderClick,
  onNewerClick,
  onNewestClick,
}: Props) => (
  <ButtonBar className={className} merged>
    <Button
      size={size}
      to={links[0]}
      disabled={!hasPrevious}
      aria-label={t('Oldest')}
      icon={<IconPrevious size="xs" />}
      onClick={onOldestClick}
    />
    <Button size={size} to={links[1]} disabled={!hasPrevious} onClick={onOlderClick}>
      {t('Older')}
    </Button>
    <Button size={size} to={links[2]} disabled={!hasNext} onClick={onNewerClick}>
      {t('Newer')}
    </Button>
    <Button
      size={size}
      to={links[3]}
      disabled={!hasNext}
      aria-label={t('Newest')}
      icon={<IconNext size="xs" />}
      onClick={onNewestClick}
    />
  </ButtonBar>
);

export default NavigationButtonGroup;
